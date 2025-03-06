import { Link, Outlet } from "react-router-dom";
import { useContext } from "react";
import { CestaContext } from "../main";

export function Home() {
    const { items } = useContext(CestaContext);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="container">
            <nav style={styles.nav}>
                <div style={styles.logo}>
                    <Link to="/" style={styles.logoLink}>
                        Shop David
                    </Link>
                </div>
                <div style={styles.links}>
                    <Link to="/productos" style={styles.link}>Productos</Link>
                    <Link to="/pedidos" style={styles.link}>Pedidos</Link>
                    <Link to="/cesta" style={styles.link}>
                        Cesta {itemCount > 0 && <span style={styles.badge}>{itemCount}</span>}
                    </Link>
                </div>
            </nav>
            <main style={styles.main}>
                <Outlet />
            </main>
        </div>
    );
}

const styles = {
    nav: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    logo: {
        fontSize: '1.5rem',
        fontWeight: 'bold'
    },
    logoLink: {
        textDecoration: 'none',
        color: '#333'
    },
    links: {
        display: 'flex',
        gap: '1.5rem'
    },
    link: {
        textDecoration: 'none',
        color: '#333',
        position: 'relative',
        padding: '0.5rem'
    },
    badge: {
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        backgroundColor: '#dc3545',
        color: 'white',
        borderRadius: '50%',
        padding: '0.25rem 0.5rem',
        fontSize: '0.75rem'
    },
    main: {
        padding: '0 1rem'
    }
};
