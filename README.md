# AUTARQ Office Portal

Small AUTARQ Office portal in front of EuroOffice / ONLYOFFICE Docs.

The EuroOffice DocumentServer at `https://eurooffice.autarq.now` is only the editor engine. This portal adds the missing product layer:

- document list
- new document creation
- upload
- editor launch with signed ONLYOFFICE config
- signed file download URL for DocumentServer
- callback endpoint that saves edited files back to storage

## Architecture

```text
iOS / Android / Browser
  -> AUTARQ Office Portal
    -> signed DocsAPI editor config
      -> EuroOffice DocumentServer
        -> signed file download from portal
        -> callback save back to portal
```

JWT stays server-side. Do not put the DocumentServer JWT secret into mobile apps.

## Local Development

```bash
npm install
JWT_SECRET=dev-secret npm start
```

Open:

```text
http://localhost:3000
```

Useful env vars:

```text
PORT=3000
PUBLIC_BASE_URL=http://localhost:3000
DOCUMENT_SERVER_URL=https://eurooffice.autarq.now
STORAGE_DIR=.data
JWT_SECRET=...
BASIC_AUTH_USER=...
BASIC_AUTH_PASSWORD=...
```

If `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` are set, browser-facing routes require Basic Auth. DocumentServer download and callback endpoints use signed URLs and do not require Basic Auth.

## Kubernetes

The included manifests target the existing production namespace:

```text
eurooffice-shared
```

They expect:

```text
secret/documentserver-jwt
key: jwtSecret
```

For Basic Auth, create:

```bash
kubectl -n eurooffice-shared create secret generic office-portal-auth \
  --from-literal=BASIC_AUTH_USER=autarq \
  --from-literal=BASIC_AUTH_PASSWORD='<strong-password>'
```

Deploy:

```bash
kubectl -n eurooffice-shared apply -f deploy/k8s/
```

Public URL:

```text
https://office.autarq.now
```

## Checks

```bash
npm run check
npm test
```
