import "./styles.css";
import { mountApp } from "./app/App";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("No se encontró el contenedor principal.");
}

mountApp(root);
