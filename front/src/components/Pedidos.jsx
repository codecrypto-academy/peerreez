import { useContext } from "react";
import { CestaContext } from "../main";

export function Pedidos() {
    const { pedidos } = useContext(CestaContext);

    if (!pedidos || pedidos.length === 0) {
        return (
            <div style={styles.container}>
                <h1>No hay pedidos realizados</h1>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1>Historial de Pedidos</h1>
            {pedidos.map((pedido, index) => (
                <div key={index} style={styles.pedido}>
                    <div style={styles.pedidoHeader}>
                        <h3>Pedido #{index + 1}</h3>
                        <p>Fecha: {pedido.fecha}</p>
                        <p>Hash: <span style={styles.hash}>{pedido.txHash}</span></p>
                    </div>
                    <div style={styles.productos}>
                        {pedido.items.map((item, itemIndex) => (
                            <div key={itemIndex} style={styles.producto}>
                                <p><strong>{item.ProductName}</strong></p>
                                <p>Cantidad: {item.quantity}</p>
                                <p>Precio unitario: ${item.UnitPrice.toFixed(2)}</p>
                                <p>Subtotal: ${(item.UnitPrice * item.quantity).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                    <div style={styles.total}>
                        <h4>Total pagado: ${pedido.total.toFixed(2)}</h4>
                    </div>
                </div>
            ))}
        </div>
    );
}

const styles = {
    container: {
        padding: "20px",
        maxWidth: "800px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif"
    },
    pedido: {
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px",
        backgroundColor: "#fff"
    },
    pedidoHeader: {
        borderBottom: "1px solid #eee",
        paddingBottom: "10px",
        marginBottom: "15px"
    },
    hash: {
        fontFamily: "monospace",
        backgroundColor: "#f8f9fa",
        padding: "2px 4px",
        borderRadius: "4px",
        fontSize: "0.9em"
    },
    productos: {
        display: "grid",
        gap: "15px"
    },
    producto: {
        backgroundColor: "#f8f9fa",
        padding: "15px",
        borderRadius: "4px"
    },
    total: {
        marginTop: "15px",
        textAlign: "right",
        borderTop: "1px solid #eee",
        paddingTop: "15px"
    }
};
