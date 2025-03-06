import React, { createContext, useState } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Cesta } from "./components/Cesta";
import { Productos } from "./components/Productos";
import { Producto } from "./components/Producto";
import { Home } from "./components/Home";
import { Pedidos } from "./components/Pedidos";

import "./index.css";

// Crear el contexto con un estado inicial
export const CestaContext = createContext({
  items: [],
  pedidos: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  addPedido: () => {}
});

const queryClient = new QueryClient();

function App() {
  const [items, setItems] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  const addItem = (product, quantity) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.ProductID === product.ProductID);
      if (existingItem) {
        return currentItems.map(item =>
          item.ProductID === product.ProductID
            ? { ...item, quantity: item.quantity + Number(quantity) }
            : item
        );
      }
      return [...currentItems, { ...product, quantity: Number(quantity) }];
    });
  };

  const removeItem = (productId) => {
    setItems(currentItems => currentItems.filter(item => item.ProductID !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    setItems(currentItems =>
      currentItems.map(item =>
        item.ProductID === productId
          ? { ...item, quantity: Number(quantity) }
          : item
      )
    );
  };

  const addPedido = (items, total, txHash) => {
    const nuevoPedido = {
      items: [...items],
      total,
      txHash,
      fecha: new Date().toLocaleString()
    };
    setPedidos(prevPedidos => [...prevPedidos, nuevoPedido]);
    // Limpiar la cesta después de crear el pedido
    setItems([]);
  };

  return (
    <CestaContext.Provider value={{ 
      items, 
      pedidos, 
      addItem, 
      removeItem, 
      updateQuantity, 
      addPedido 
    }}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />}>
              <Route index element={<Productos />} />
              <Route path="productos" element={<Productos />} />
              <Route path="productos/:id" element={<Producto />} />
              <Route path="cesta" element={<Cesta />} />
              <Route path="pedidos" element={<Pedidos />} />
              <Route path="*" element={<Productos />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </CestaContext.Provider>
  );
}

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("No se encontró el elemento con id 'root'");
}
