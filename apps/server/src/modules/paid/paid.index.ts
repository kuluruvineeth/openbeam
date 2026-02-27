import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { Hono } from "hono";
import { paymentConfig } from "@/lib/payment-config";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  paidRagAnswerHandler,
  paidRagSynthesizeHandler,
  paidSearchHandler,
} from "./paid.handlers";

const paid = new Hono<AuthEnv>();

paid.use("/*", requireAuth);

const facilitatorClient = new HTTPFacilitatorClient({
  url: paymentConfig.facilitatorUrl,
});
const resourceServer = new x402ResourceServer(facilitatorClient);

paid.use(
  paymentMiddleware(
    {
      "GET /search": {
        accepts: {
          scheme: "exact",
          price: "$0.01",
          network: paymentConfig.network,
          payTo: paymentConfig.payeeAddress,
        },
        description: "Search query",
      },
      "POST /rag/answer": {
        accepts: {
          scheme: "exact",
          price: "$0.05",
          network: paymentConfig.network,
          payTo: paymentConfig.payeeAddress,
        },
        description: "RAG answer",
      },
      "POST /rag/synthesize": {
        accepts: {
          scheme: "exact",
          price: "$0.05",
          network: paymentConfig.network,
          payTo: paymentConfig.payeeAddress,
        },
        description: "RAG synthesis",
      },
    },
    resourceServer
  )
);

paid.get("/search", paidSearchHandler);
paid.post("/rag/answer", paidRagAnswerHandler);
paid.post("/rag/synthesize", paidRagSynthesizeHandler);

export default paid;
export { paymentConfig };
