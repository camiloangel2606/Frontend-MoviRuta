// environment.ts (desarrollo)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5050/api',
  negocioUrl: 'http://localhost:3000',
  recaptchaSiteKey: '6Lc_TKgsAAAAAIExjkRjqGLU8yiATxAAr0TcbilD',
  securityLogsEnabled: true,
  epayco: {
    publicKey: '68362615c6bd7a4f53aac3a7db80248e',
    p_cust_id_cliente: '1583948',
    p_key: '85d9be539ada27ad0b8e9a05805d7e23a3f16af',
    test: true, // true para ambiente de prueba, false para producción
    checkoutUrl: 'https://checkout.epayco.co/checkout.js',
    webhookBaseUrl: 'https://mirier-lavelle-continently.ngrok-free.dev'
  }
};