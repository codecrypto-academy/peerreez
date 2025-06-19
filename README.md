# 📦 Ejercicio Adicional: Hyperledger Fabric + Northwind

## 🎯 Objetivo

Este ejercicio tiene como objetivo utilizar **Hyperledger Fabric como base de datos**, replicando parte del modelo relacional de **Northwind**. El modelo de datos proviene del repositorio:

🔗 https://github.com/pthom/northwind_psql

---

## 🧱 Estructura del Proyecto

El proyecto consta de los siguientes componentes:

- 🔄 **PostgreSQL en Docker** para importar los datos de Northwind.
- 🔗 **Chaincode en Hyperledger Fabric** con funciones CRUD para clientes y pedidos.
- 🔧 **Script en Node.js** para cargar los datos a Fabric.
- 🌐 **API REST** (Node.js) para exponer consultas.
- 🖥️ **Frontend en React** para interactuar con el sistema.

---

## 🗃️ Modelo de Datos

Se utilizarán las siguientes entidades del modelo Northwind:

- `Customer`
- `Order`
- `OrderDetail`

---

## 🧩 Funcionalidades del Chaincode

El **Chaincode** desarrollado debe incluir los siguientes métodos:

| Método                    | Descripción                                             |
|---------------------------|---------------------------------------------------------|
| `addCustomer`             | Añade un nuevo cliente al ledger.                      |
| `addOrder`                | Añade una nueva factura/pedido.                        |
| `addOrderDetail`          | Añade una línea de pedido a una factura.               |
| `queryCustomerByNombre`   | Consulta clientes por nombre.                          |
| `queryOrdersByCustomerID` | Consulta un cliente y sus facturas asociadas.          |
| `queryOrderById`          | Consulta completa de un pedido y sus líneas asociadas. |

---

## 🧪 Carga de Datos (Node.js)

Desarrollar un script en Node.js que:

1. Cargue **solo 10 clientes** desde la base de datos PostgreSQL.
2. Use los métodos `addCustomer`, `addOrder`, y `addOrderDetail` del chaincode para almacenar en Fabric.

---

## 🌐 API REST

Crear una **API en Node.js** que utilice el chaincode para ofrecer los siguientes endpoints:

- `GET /customers?name=Nombre` → Buscar clientes por nombre.
- `GET /orders/:customerId` → Listar pedidos de un cliente.
- `GET /order/:orderId` → Obtener un pedido completo con sus detalles.

---

## 🖥️ Frontend en React

Construir una interfaz web que permita:

- Buscar clientes por nombre.
- Listar pedidos por cliente.
- Ver los detalles de un pedido específico.

---

## 🐘 PostgreSQL con Docker

Usar un contenedor de PostgreSQL para cargar los datos Northwind:

```bash
docker run --name northwind-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
