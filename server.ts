import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fastifyStatic from "@fastify/static";
import type { FastifyReply, FastifyRequest } from "fastify";
import Fastify from "fastify";
import fetch, { RequestInit } from "node-fetch";
import path from "path";

const PEPY_KEY = nullthrows(process.env.PEPY_KEY);
const GH_TOKEN = nullthrows(process.env.GH_TOKEN);
const NIXTLA_TOKEN = nullthrows(process.env.NIXTLA_TOKEN);

const server = Fastify({
  // logger: true,
});

function nullthrows<T>(val: T | null | undefined, msg?: string): T {
  if (val == null) {
    throw new Error(msg ?? `InvariantViolation: nullthrows on ${val}`);
  }
  return val;
}

server.register(fastifyStatic, { root: path.join(path.resolve(), "dist") });

server.get("/pypi/*", forward({ to: "https://pypi.python.org" }));

server.get(
  "/pepy/*",
  forward({
    to: "http://api.pepy.tech",
    replacePath(path) {
      return path.replace(/^\/pepy/, "/api");
    },
    reqInit: {
      headers: {
        "X-Api-Key": PEPY_KEY,
      },
    },
  })
);

server.post(
  "/nixtla",
  forward({
    to: "https://dashboard.nixtla.io/api/timegpt",
    replacePath: () => "",
    reqInit: {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${NIXTLA_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  })
);

server.get(
  "/github/*",
  forward({
    to: "https://api.github.com",
    replacePath(path) {
      return path.replace(/^\/github/, "");
    },
    sendHeaders: ["Accept"],
    recieveHeaders: ["Link"],
    reqInit: {
      headers: {
        Authorization: `token ${GH_TOKEN}`,
      },
    },
  })
);

// Run the server!
server.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
  console.error(err);
  console.log(address);
});

function forward({
  to,
  replacePath,
  sendHeaders = [],
  recieveHeaders = [],
  reqInit = {},
}: {
  to: string;
  replacePath?: (path: string) => string;
  sendHeaders?: string[];
  recieveHeaders?: string[];
  reqInit?: {
    headers?: RequestInit["headers"];
    method?: RequestInit["method"];
  };
}) {
  return async (req: FastifyRequest, res: FastifyReply) => {
    const path = replacePath == null ? req.url : replacePath(req.url);
    const url = `${to}${path}`;
    console.log(req.method, req.url, "->", url);

    let data;
    try {
      const body =
        req.body == null
          ? null
          : typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body);
      if (req.method === "POST") {
        console.log("body:", body?.substring(0, 10), "etc");
      }

      const headers = { ...reqInit.headers };
      for (const header of sendHeaders) {
        const currVal = req.headers[header.toLowerCase()];
        if (currVal != null) {
          headers[header] = currVal;
        }
      }

      // console.log(headers);

      const response = await fetch(url, {
        method: reqInit.method,
        headers,
        body,
      });
      data = await response.text();

      for (const header of recieveHeaders) {
        if (response.headers.has(header)) {
          res.header(header, response.headers.get(header));
        }
      }

      res.send(JSON.parse(data));
    } catch (e) {
      res.code(500).send({
        status: "error",
        resolvedPath: path,
        dest: url,
        data: data,
      });
      console.error(e);
    }
  };
}
