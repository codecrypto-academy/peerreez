import { useQuery } from "react-query";
import { Link } from "react-router-dom"; // Importa Link para la navegación

export function Productos() {
    const { data, isLoading, error } = useQuery("productos", async () => {
        const res = await fetch("http://localhost:5555/products");
        if (!res.ok) throw new Error("Error al cargar los productos");
        return res.json();
    });

    if (isLoading) return <div>Cargando productos...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Lista de Productos</h1>
            <div style={styles.grid}>
                {data.map((product) => (
                    <div key={product.ProductID} style={styles.card}>
                        <h2>{product.ProductName}</h2>
                        <Link to={`/productos/${product.ProductID}`} style={styles.buttonLink}>
                            <button style={styles.button}>Ver Producto</button>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Estilos en objeto para mantener el código limpio
const styles = {
    container: { padding: "20px", fontFamily: "Arial, sans-serif" },
    title: { textAlign: "center" },
    grid: { 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", 
        gap: "20px" 
    },
    card: { 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between", 
        padding: "15px", 
        border: "1px solid #ddd", 
        borderRadius: "8px", 
        textAlign: "center" 
    },
    buttonLink: { textDecoration: "none" }, // Elimina el subrayado del enlace
    button: { 
        marginTop: "10px", 
        padding: "10px", 
        background: "#007bff", 
        color: "#fff", 
        border: "none", 
        cursor: "pointer" 
    },
};
