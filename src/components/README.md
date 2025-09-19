# Componentes UI - Besu Control Panel

Esta carpeta contiene los componentes React utilizados en la interfaz del panel de control para redes Hyperledger Besu. Los componentes están diseñados para ser reutilizables, accesibles y con estilos modernos usando Tailwind CSS.

## Componentes principales

- **AddNetworkForm.tsx**  
  Formulario para crear una nueva red Besu. Permite ingresar nombre y chainId, y realiza la petición al endpoint `/api/deploy`.

- **NetworksList.tsx**  
  Lista y gestiona las redes Besu y sus nodos. Permite añadir, eliminar, arrancar, parar y limpiar nodos/redes mediante la API.

- **Modal.tsx / ModalComponent.tsx**  
  Componente modal reutilizable para mostrar formularios, mensajes o confirmaciones.

- **Header.tsx**  
  Barra superior con logo, título y botones de navegación (gestión, documentación, soporte, añadir red).

- **ThemeContext.tsx**  
  Contexto React para gestionar el tema (claro/oscuro) de la aplicación.

- **StartNetworkButton.tsx / StopNetworkButton.tsx**  
  Botones para iniciar o detener una red Besu.

- **Documentation.tsx / DocumentationButton.tsx**  
  Componentes para mostrar y acceder a la documentación del panel.

- **Support.tsx / SupportButton.tsx**  
  Componentes para mostrar información de soporte y ayuda.

## Uso

Importa los componentes según tus necesidades en las páginas o layouts de la app:

```tsx
import AddNetworkForm from "@/components/AddNetworkForm";
import NetworksList from "@/components/NetworksList";
import Modal from "@/components/Modal";
import Header from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeContext";
```

Ejemplo de uso de ThemeProvider:

```tsx
<ThemeProvider>
  <App />
</ThemeProvider>
```

## Estilos

Todos los componentes usan clases de Tailwind CSS para un diseño moderno, responsivo y accesible.

## Accesibilidad

- Etiquetas `aria-label` y roles en formularios, listas y botones.
- Navegación por teclado y feedback visual en acciones.

## Personalización

Puedes modificar los componentes para adaptarlos a tus necesidades, añadir props o cambiar estilos según el branding de tu proyecto.

---
