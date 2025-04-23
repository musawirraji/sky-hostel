export interface RemitaPaymentResponse {
  RRR: string
  transactionId: string
  message?: string
  status?: string
  processorId?: string
  amount?: string
}

export interface RemitaPaymentError {
  message?: string
  responseMessage?: string
  error?: string
  code?: string | number
}
