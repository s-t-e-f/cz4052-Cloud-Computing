const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    createProxyMiddleware('/getUsersByIdLambdaUrl', {
      target: 'https://trqz5wen4hevvs2imyd3o7bxqe0oxtau.lambda-url.ap-southeast-1.on.aws', // API endpoint 1
      changeOrigin: true,
      pathRewrite: {
        "^/getUsersByIdLambdaUrl": "",
      },
      headers: {
        Connection: "keep-alive"
      }
    })
  );
  app.use(
    createProxyMiddleware('/getUsers', {
      target: 'https://sokrbe7otefnvtudwoc3e3szwm0pqqlz.lambda-url.ap-southeast-1.on.aws/', // API endpoint 2
      changeOrigin: true,
      pathRewrite: {
        "^/getUsers": "",
      },
      headers: {
        Connection: "keep-alive"
      }
    })
  );
  // app.use(
  //   createProxyMiddleware('/predictApi', {
  //     target: 'http://127.0.0.1:8000/', // API endpoint 2
  //     changeOrigin: true,
  //     pathRewrite: {
  //       "^/predictApi": "/",
  //     },
  //     headers: {
  //       Connection: "keep-alive"
  //     }
  //   })
  // );
}
