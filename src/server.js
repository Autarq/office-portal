import express from "express";
import multer from "multer";
import { blankFileName, createBlankFile } from "./templates.js";
import { editorPage, homePage, layout } from "./html.js";
import { extensionForName, isSupportedExtension, typeForExtension } from "./file-types.js";
import { signJwt, verifyJwt } from "./crypto.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

export function createServer({ config, store }) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json({ limit: "20mb" }));
  app.use(authMiddleware(config));

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, service: "autarq-office-portal" });
  });

  app.get("/", async (_req, res, next) => {
    try {
      res.type("html").send(homePage(await store.list()));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/files/new", async (req, res, next) => {
    try {
      const ext = String(req.body.type || "").toLowerCase();
      if (!isSupportedExtension(ext)) {
        res.status(400).send("Unsupported file type");
        return;
      }
      const buffer = await createBlankFile(ext);
      const file = await store.createFromBuffer(blankFileName(ext), buffer);
      res.redirect(`/editor/${file.id}`);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/files/upload", upload.single("file"), async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).send("Missing file");
        return;
      }
      const ext = extensionForName(req.file.originalname);
      if (!isSupportedExtension(ext)) {
        res.status(415).send("Unsupported file type");
        return;
      }
      const file = await store.createFromBuffer(req.file.originalname, req.file.buffer);
      res.redirect(`/editor/${file.id}`);
    } catch (error) {
      next(error);
    }
  });

  app.get("/editor/:id", async (req, res, next) => {
    try {
      const file = await store.get(req.params.id);
      if (!file) {
        res.status(404).send(notFoundPage());
        return;
      }
      const editorConfig = buildEditorConfig({ config, file });
      res.type("html").send(editorPage({
        file,
        config: editorConfig,
        documentServerUrl: config.documentServerUrl
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/files/:id/download", async (req, res, next) => {
    try {
      verifyActionToken(req.query.token, config.jwtSecret, req.params.id, "download");
      const file = await store.get(req.params.id);
      if (!file) {
        res.status(404).send("Not found");
        return;
      }
      const content = await store.readContent(file);
      res.setHeader("Content-Type", file.mime);
      res.setHeader("Content-Disposition", contentDisposition(file.name));
      res.send(content);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/onlyoffice/callback/:id", async (req, res, next) => {
    try {
      verifyActionToken(req.query.token, config.jwtSecret, req.params.id, "callback");

      if (req.body?.token) {
        verifyJwt(req.body.token, config.jwtSecret);
      }

      const status = Number(req.body?.status);
      if ((status === 2 || status === 6) && req.body?.url) {
        const response = await fetch(req.body.url);
        if (!response.ok) {
          throw new Error(`DocumentServer download failed: ${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        await store.updateContent(req.params.id, buffer);
      }

      res.json({ error: 0 });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    const status = /token|signature|expired/i.test(error.message) ? 403 : 500;
    res.status(status).type("html").send(layout({
      title: "AUTARQ Office Error",
      body: `<main class="shell"><section class="empty"><h2>Fehler</h2><p>${escapeError(error.message)}</p></section></main>`
    }));
  });

  return app;
}

export function buildEditorConfig({ config, file }) {
  const type = typeForExtension(file.ext);
  const downloadToken = signJwt({ sub: file.id, action: "download", version: file.version }, config.jwtSecret, {
    expiresInSeconds: 7 * 24 * 60 * 60
  });
  const callbackToken = signJwt({ sub: file.id, action: "callback" }, config.jwtSecret, {
    expiresInSeconds: 7 * 24 * 60 * 60
  });

  const editorConfig = {
    type: "mobile",
    documentType: type.documentType,
    document: {
      fileType: file.ext,
      key: `${file.id}-${file.version}`,
      title: file.name,
      url: `${config.publicBaseUrl}/api/files/${file.id}/download?token=${encodeURIComponent(downloadToken)}`,
      permissions: {
        comment: true,
        download: true,
        edit: true,
        fillForms: true,
        print: true,
        review: true
      }
    },
    editorConfig: {
      callbackUrl: `${config.publicBaseUrl}/api/onlyoffice/callback/${file.id}?token=${encodeURIComponent(callbackToken)}`,
      lang: "de",
      mode: "edit",
      user: {
        id: "autarq-user",
        name: "AUTARQ User"
      },
      customization: {
        anonymous: {
          request: false
        },
        autosave: true,
        compactHeader: true,
        compactToolbar: false,
        forcesave: true,
        help: false
      }
    }
  };

  return {
    ...editorConfig,
    token: signJwt(editorConfig, config.jwtSecret)
  };
}

function authMiddleware(config) {
  const enabled = Boolean(config.basicAuthUser && config.basicAuthPassword);
  return (req, res, next) => {
    if (!enabled || isBypassRoute(req.path)) {
      next();
      return;
    }

    const header = req.get("authorization") || "";
    const [scheme, encoded] = header.split(" ");
    if (scheme !== "Basic" || !encoded) {
      requestAuth(res);
      return;
    }

    const [user, password] = Buffer.from(encoded, "base64").toString("utf8").split(":");
    if (user === config.basicAuthUser && password === config.basicAuthPassword) {
      next();
      return;
    }

    requestAuth(res);
  };
}

function isBypassRoute(path) {
  return path === "/healthz"
    || /^\/api\/files\/[^/]+\/download$/.test(path)
    || /^\/api\/onlyoffice\/callback\/[^/]+$/.test(path);
}

function requestAuth(res) {
  res.setHeader("WWW-Authenticate", 'Basic realm="AUTARQ Office"');
  res.status(401).send("Authentication required");
}

function verifyActionToken(token, secret, id, action) {
  const payload = verifyJwt(token, secret);
  if (payload.sub !== id || payload.action !== action) {
    throw new Error("Invalid action token");
  }
  return payload;
}

function contentDisposition(name) {
  const fallback = name.replace(/[^\w.\- ]+/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

function notFoundPage() {
  return layout({
    title: "Nicht gefunden",
    body: `<main class="shell"><section class="empty"><h2>Datei nicht gefunden</h2><p>Diese Datei existiert nicht mehr.</p></section></main>`
  });
}

function escapeError(message) {
  return String(message).replace(/[<>&"]/g, "");
}
