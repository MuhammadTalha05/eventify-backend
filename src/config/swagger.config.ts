import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Auth API Documentation",
      version: "1.0.0",
      description: "API documentation for authentication and user management",
    },
    servers: [
      {
        url: "http://localhost:4000/api", // Adjust base URL
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // where Swagger looks for annotations
};
const swaggerSpec = swaggerJSDoc(options);
export const setupSwagger = (app: Express) => {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};