export const FILE_TYPES = {
  docx: {
    label: "Write",
    documentType: "word",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    className: "word"
  },
  xlsx: {
    label: "Sheets",
    documentType: "cell",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    className: "sheet"
  },
  pptx: {
    label: "Slides",
    documentType: "slide",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    className: "slide"
  },
  pdf: {
    label: "PDF",
    documentType: "pdf",
    mime: "application/pdf",
    className: "pdf"
  }
};

export function extensionForName(name) {
  const match = /\.([a-z0-9]+)$/i.exec(name || "");
  return match ? match[1].toLowerCase() : "";
}

export function isSupportedExtension(ext) {
  return Boolean(FILE_TYPES[ext]);
}

export function typeForExtension(ext) {
  const type = FILE_TYPES[ext];
  if (!type) {
    throw new Error(`Unsupported file type: ${ext}`);
  }
  return type;
}
