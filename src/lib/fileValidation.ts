import {
  DOCX_MIME_TYPE,
  PDF_MIME_TYPE,
  type SupportedIaMimeType,
  type ValidatedIaFile,
} from '../types/ia';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export function validateIaFile(file: File): ValidatedIaFile {
  const filename = file.name.trim();

  if (!filename) {
    throw new FileValidationError(
      'The selected document does not have a valid filename.'
    );
  }

  if (file.size <= 0) {
    throw new FileValidationError('The selected document is empty.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new FileValidationError(
      'The document is larger than 20 MB. Please choose a smaller PDF or DOCX file.'
    );
  }

  const lowerFilename = filename.toLowerCase();

  let mimeType: SupportedIaMimeType;
  let extension: 'pdf' | 'docx';

  if (lowerFilename.endsWith('.pdf')) {
    mimeType = PDF_MIME_TYPE;
    extension = 'pdf';
  } else if (lowerFilename.endsWith('.docx')) {
    mimeType = DOCX_MIME_TYPE;
    extension = 'docx';
  } else {
    throw new FileValidationError('Please select a PDF or DOCX document.');
  }

  if (
    file.type &&
    file.type !== mimeType &&
    file.type !== 'application/octet-stream'
  ) {
    throw new FileValidationError(
      'The document type does not match its filename. Please choose a valid PDF or DOCX file.'
    );
  }

  return {
    file,
    filename,
    mimeType,
    sizeBytes: file.size,
    sizeLabel: formatFileSize(file.size),
    extension,
  };
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const kilobytes = sizeBytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  const megabytes = kilobytes / 1024;

  return `${megabytes.toFixed(1)} MB`;
}
