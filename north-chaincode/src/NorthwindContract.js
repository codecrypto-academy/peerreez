const { Contract } = require('fabric-contract-api');

class NorthwindContract extends Contract {
    // Método para añadir un cliente
    async addCustomer(ctx, id, name, address) {
        const exists = await ctx.stub.getState(id);
        if (exists && exists.length > 0) {
            throw new Error(`Cliente ${id} ya existe`);
        }

        const customer = {
            id,
            name,
            address,
            docType: 'customer',
        };

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(customer)));
    }

    // Método para añadir un pedido
    async addOrder(ctx, orderId, customerId, date) {
        const exists = await ctx.stub.getState(orderId);
        if (exists && exists.length > 0) {
            throw new Error(`Pedido ${orderId} ya existe`);
        }

        const order = {
            orderId,
            customerId,
            date,
            docType: 'order',
        };

        await ctx.stub.putState(orderId, Buffer.from(JSON.stringify(order)));
    }

    // Método para añadir un detalle de pedido
    async addOrderDetail(ctx, detailId, orderId, productId, quantity) {
        const exists = await ctx.stub.getState(detailId);
        if (exists && exists.length > 0) {
            throw new Error(`Detalle de pedido ${detailId} ya existe`);
        }

        const detail = {
            detailId,
            orderId,
            productId,
            quantity,
            docType: 'orderDetail',
        };

        await ctx.stub.putState(detailId, Buffer.from(JSON.stringify(detail)));
    }

    async queryCustomerByNombre(ctx, name) {
        const query = {
            selector: {
                docType: 'customer',
                name: name,
            },
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const result = [];

        let res = await iterator.next();
        while (!res.done) {
            const record = res.value;
            if (record && record.value.toString()) {
                result.push(JSON.parse(record.value.toString('utf8')));
            }
            res = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(result);
    }

    async queryOrdersByCustomerID(ctx, customerId) {
        const query = {
            selector: {
                docType: 'order',
                customerId: customerId,
            },
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const orders = [];

        let res = await iterator.next();
        while (!res.done) {
            const record = res.value;
            if (record && record.value.toString()) {
                orders.push(JSON.parse(record.value.toString('utf8')));
            }
            res = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(orders);
    }


    // Consulta: obtener un pedido por su ID
    async queryOrderById(ctx, orderId) {
        const data = await ctx.stub.getState(orderId);
        if (!data || data.length === 0) {
            throw new Error(`Pedido ${orderId} no encontrado`);
        }

        return data.toString();
    }
}

module.exports = NorthwindContract;
