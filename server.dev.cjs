// @ts-check
const fs = require("fs");
const path = require("path");
const express = require("express");
const httpStatus = require("http-status");

async function createServer(root = process.cwd()) {
  const resolve = (p) => path.resolve(__dirname, p);

  const app = express();

  const router = express.Router();

  router.get('/currentUserNav', (req, res) => {
    res.status(httpStatus.OK).json([
      {
        name: 'Home',
        parentId: 0,
        id: 7,
        meta: {
          icon: 'HistoryOutlined',
          title: 'pages.dashboard.workplace.title',
          show: true,
        },
        component: 'HomeView',
        path: '/home',
      },
      {
        name: 'About',
        parentId: 0,
        id: 2,
        meta: {
          icon: 'HeartOutlined',
          title: 'pages.dashboard.analysis.title',
          show: true,
        },
        component: 'about/index',
        path: '/about',
      },
    ]);
  });

  app.use('/api', router);

  /**
   * @type {import('vite').ViteDevServer}
   */
  const vite = await require("vite").createServer({
    root,
    logLevel: "error",
    server: {
      middlewareMode: "ssr",
      watch: {
        // During tests we edit the files too fast and sometimes chokidar
        // misses change events, so enforce polling for consistency
        usePolling: true,
        interval: 100,
      },
    },
  });
  // use vite's connect instance as middleware
  app.use(vite.middlewares);

  app.use("*", async (req, res) => {
    try {
      const url = req.originalUrl.replace('/mobile/', '/');

      let template = fs.readFileSync(resolve("index.html"), "utf-8");
      template = await vite.transformIndexHtml(url, template);
      const render = (await vite.ssrLoadModule("/src/entry-server.ts")).render;

      const [appHtml, preloadLinks] = await render(url, {});

      const html = template
        .replace(`<!--preload-links-->`, preloadLinks)
        .replace(`<!--ssr-outlet-->`, appHtml);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite && vite.ssrFixStacktrace(e);
      console.log(e.stack);
      res.status(500).end(e.stack);
    }
  });

  return { app, vite };
}

createServer().then(({ app }) =>
  app.listen(3000, () => {
    console.log("http://localhost:3000");
  })
);

// for test use
exports.createServer = createServer;
