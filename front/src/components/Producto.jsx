import { useQuery } from "react-query";
import { useParams } from "react-router-dom";
import { useState, useContext } from "react";
import { CestaContext } from "../main";

export function Producto() {
    const { id } = useParams(); // Obtener el id del producto desde la URL
    const [quantity, setQuantity] = useState(1); // Estado para la cantidad del producto a añadir
    const { addItem } = useContext(CestaContext);

    // Obtener los datos del producto con la consulta react-query
    const { data, isLoading, error } = useQuery(["producto", id], async () => {
        const res = await fetch(`http://localhost:5555/products/${id}`);
        if (!res.ok) throw new Error("Error al cargar el producto");
        return res.json(); // La respuesta es un array, por lo que extraemos el primer producto
    });

    if (isLoading) return <div>Cargando...</div>;
    if (error) return <div>Error: {error.message}</div>;

    // Extraer el primer producto del array
    const product = data[0]; // La respuesta es un array, tomamos el primer elemento

    // Verificar que el valor de UnitPrice sea válido antes de llamar a toFixed
    const unitPrice = product?.UnitPrice ?? 0; // Si UnitPrice es undefined o null, usar 0

    // Función para manejar el cambio de cantidad
    const handleQuantityChange = (e) => {
        setQuantity(e.target.value);
    };

    // Función para añadir el producto a la cesta
    const addToCart = () => {
        addItem(product, quantity);
        alert(`Añadido ${quantity} unidades de ${product.ProductName} a la cesta.`);
    };

    return (
        <div style={styles.container}>
            <h1>{product.ProductName}</h1>
            <p><strong>Precio:</strong> ${unitPrice.toFixed(2)}</p>
            <p><strong>Descripción:</strong> {product.QuantityPerUnit}</p>
            <p><strong>Stock:</strong> {product.UnitsInStock} unidades disponibles</p>

            <div>
                <label htmlFor="quantity">Cantidad:</label>
                <input
                    type="number"
                    id="quantity"
                    value={quantity}
                    min="1"
                    max={product.UnitsInStock}
                    onChange={handleQuantityChange}
                    style={styles.input}
                />
            </div>

            <button onClick={addToCart} style={styles.button}>Añadir a la cesta</button>
        </div>
    );
}

// Estilos en objeto para mantener el código limpio
const styles = {
    container: { padding: "20px", fontFamily: "Arial, sans-serif" },
    button: { 
        marginTop: "10px", 
        padding: "10px", 
        background: "#007bff", 
        color: "#fff", 
        border: "none", 
        cursor: "pointer" 
    },
    input: { 
        padding: "5px", 
        marginLeft: "10px", 
        width: "50px", 
        textAlign: "center" 
    },
};
