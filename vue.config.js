const { defineConfig } = require('@vue/cli-service')

function registerLocalNetlifyFunction(app, route, handler) {
  app.use(route, (request, response) => {
    let rawBody = '';

    request.on('data', (chunk) => {
      rawBody += chunk;
    });

    request.on('end', async () => {
      try {
        const result = await handler({
          httpMethod: request.method,
          headers: request.headers,
          body: rawBody,
        });

        Object.entries(result.headers || {}).forEach(([name, value]) => {
          response.setHeader(name, value);
        });
        response.statusCode = result.statusCode || 200;
        response.end(result.body || '');
      } catch (error) {
        console.error('[local-netlify-function] failed', {
          route,
          message: error.message,
          stack: error.stack,
        });
        response.statusCode = 500;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ error: 'Local function failed' }));
      }
    });
  });
}

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    historyApiFallback: true,
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      const { handler: skylerBotHandler } = require('./netlify/functions/skyler-bot');
      registerLocalNetlifyFunction(
        devServer.app,
        '/.netlify/functions/skyler-bot',
        skylerBotHandler
      );

      return middlewares;
    },
  },
})
