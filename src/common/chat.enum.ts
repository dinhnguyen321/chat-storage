export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export enum DocumentType {
  PDF = 'pdf',
  MD = 'md',
  DOCX = 'docx',
}

export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}