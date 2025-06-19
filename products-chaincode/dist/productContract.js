"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UUID_NAMESPACE = void 0;
const uuid_1 = require("uuid");
exports.UUID_NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";
const { Contract } = require("fabric-contract-api");
// Definir nombres de tipo de objeto para el prefijo
const productPrefix = "product";
const ventaPrefix = "venta";
const balancePrefix = "balance";
const tslog = require("tslog");
const log = new tslog.Logger({});
const ALLOWED_MSPS_CREAR_PRODUCTOS = ["SonyMSP"];
const ALLOWED_MSPS_COMPRAR = ["MarketplaceMSP"];
class ProductContract extends Contract {
    getMyIdentity(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                id: ctx.clientIdentity.getID(),
                mspId: ctx.clientIdentity.getMSPID(),
            };
        });
    }
    Ping(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info("ping");
            return "pong";
        });
    }
    createProduct(ctx, id, nombre, descripcion, precio, cantidad) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ALLOWED_MSPS_CREAR_PRODUCTOS.includes(ctx.clientIdentity.getMSPID())) {
                throw new Error("No tienes permiso para crear productos");
            }
            const productKey = ctx.stub.createCompositeKey(productPrefix, [id]);
            const precioInt = parseInt(precio);
            if (isNaN(precioInt)) {
                throw new Error("El precio debe ser un número");
            }
            const cantidadInt = parseInt(cantidad);
            if (isNaN(cantidadInt)) {
                throw new Error("La cantidad debe ser un número");
            }
            const product = {
                id,
                nombre,
                descripcion,
                precio: precioInt,
                cantidad: cantidadInt,
                createdBy: ctx.clientIdentity.getID(),
            };
            yield ctx.stub.putState(productKey, Buffer.from(JSON.stringify(product)));
            log.info("Producto creado", product);
            return JSON.stringify(product);
        });
    }
    getProduct(ctx, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const productKey = ctx.stub.createCompositeKey(productPrefix, [id]);
            const product = yield ctx.stub.getState(productKey);
            return product.toString();
        });
    }
    updateProduct(ctx, id, nombre, descripcion, precio, cantidad) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ALLOWED_MSPS_CREAR_PRODUCTOS.includes(ctx.clientIdentity.getMSPID())) {
                throw new Error("No tienes permiso para actualizar productos");
            }
            const productKey = ctx.stub.createCompositeKey(productPrefix, [id]);
            const precioInt = parseInt(precio);
            if (isNaN(precioInt)) {
                throw new Error("El precio debe ser un número");
            }
            const cantidadInt = parseInt(cantidad);
            if (isNaN(cantidadInt)) {
                throw new Error("La cantidad debe ser un número");
            }
            const product = {
                id,
                nombre,
                descripcion,
                precio: precioInt,
                cantidad: cantidadInt,
                createdBy: ctx.clientIdentity.getID(),
            };
            yield ctx.stub.putState(productKey, Buffer.from(JSON.stringify(product)));
            return JSON.stringify(product);
        });
    }
    deleteProduct(ctx, id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ALLOWED_MSPS_CREAR_PRODUCTOS.includes(ctx.clientIdentity.getMSPID())) {
                throw new Error("No tienes permiso para crear productos");
            }
            const productKey = ctx.stub.createCompositeKey(productPrefix, [id]);
            yield ctx.stub.deleteState(productKey);
        });
    }
    getMyBalance(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const balanceKey = ctx.stub.createCompositeKey(balancePrefix, [ctx.clientIdentity.getID()]);
            const balance = yield ctx.stub.getState(balanceKey);
            return balance.toString();
        });
    }
    setMyBalance(ctx, balance) {
        return __awaiter(this, void 0, void 0, function* () {
            const balanceKey = ctx.stub.createCompositeKey(balancePrefix, [ctx.clientIdentity.getID()]);
            const balanceInt = parseInt(balance);
            if (isNaN(balanceInt)) {
                throw new Error("La cantidad debe ser un número");
            }
            const balanceItem = {
                balance: balanceInt,
            };
            yield ctx.stub.putState(balanceKey, Buffer.from(JSON.stringify(balanceItem)));
            return balanceItem;
        });
    }
    comprar(ctx, id, cantidad) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ALLOWED_MSPS_COMPRAR.includes(ctx.clientIdentity.getMSPID())) {
                throw new Error("No tienes permiso para comprar");
            }
            const cantidadInt = parseInt(cantidad);
            if (isNaN(cantidadInt)) {
                throw new Error("La cantidad debe ser un número");
            }
            const productKey = ctx.stub.createCompositeKey(productPrefix, [id]);
            const product = yield ctx.stub.getState(productKey);
            const productJson = JSON.parse(product.toString());
            if (cantidadInt > productJson.cantidad) {
                throw new Error("No hay suficientes productos");
            }
            const balanceKey = ctx.stub.createCompositeKey(balancePrefix, [ctx.clientIdentity.getID()]);
            const balance = yield ctx.stub.getState(balanceKey);
            const balanceJson = JSON.parse(balance.toString());
            if (balanceJson.balance < productJson.precio * cantidadInt) {
                throw new Error("No hay suficiente balance");
            }
            balanceJson.balance = balanceJson.balance - productJson.precio * cantidadInt;
            yield ctx.stub.putState(balanceKey, Buffer.from(JSON.stringify(balanceJson)));
            productJson.cantidad = productJson.cantidad - cantidadInt;
            yield ctx.stub.putState(productKey, Buffer.from(JSON.stringify(productJson)));
            const ventaId = (0, uuid_1.v5)(ctx.stub.getTxID() + ctx.clientIdentity.getMSPID() + id + cantidad, exports.UUID_NAMESPACE);
            const ventaKey = ctx.stub.createCompositeKey(ventaPrefix, [ctx.clientIdentity.getID(), ventaId]);
            const venta = {
                id: ventaId,
                cantidad: cantidadInt,
                compradoPor: ctx.clientIdentity.getID(),
            };
            yield ctx.stub.putState(ventaKey, Buffer.from(JSON.stringify(venta)));
            return JSON.stringify(venta);
        });
    }
    getVenta(ctx, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const ventaKey = ctx.stub.createCompositeKey(ventaPrefix, [ctx.clientIdentity.getID(), id]);
            const venta = yield ctx.stub.getState(ventaKey);
            return venta.toString();
        });
    }
    getMyVentas(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            // venta\u0000ID_USER
            const ventaIterator = yield ctx.stub.getStateByPartialCompositeKey(ventaPrefix, [ctx.clientIdentity.getID()]);
            const ventas = [];
            while (true) {
                const venta = yield ventaIterator.next();
                if (venta.value && venta.value.value.toString()) {
                    let key = ctx.stub.splitCompositeKey(venta.value.key);
                    ventas.push({ Key: key.attributes[1], Record: JSON.parse(venta.value.value.toString()) });
                }
                if (venta.done) {
                    yield ventaIterator.close();
                    return JSON.stringify(ventas);
                }
            }
        });
    }
    limpiarChaincode(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            let iterator = yield ctx.stub.getStateByPartialCompositeKey(productPrefix, []);
            let result = yield iterator.next();
            while (!result.done) {
                yield ctx.stub.deleteState(result.value.key);
                result = yield iterator.next();
            }
            iterator = yield ctx.stub.getStateByPartialCompositeKey(balancePrefix, []);
            result = yield iterator.next();
            while (!result.done) {
                yield ctx.stub.deleteState(result.value.key);
                result = yield iterator.next();
            }
            iterator = yield ctx.stub.getStateByPartialCompositeKey(ventaPrefix, []);
            result = yield iterator.next();
            while (!result.done) {
                yield ctx.stub.deleteState(result.value.key);
                result = yield iterator.next();
            }
            return "OK";
        });
    }
}
module.exports = ProductContract;
//# sourceMappingURL=productContract.js.map