import { useContext, useState, useEffect } from "react";
import { CestaContext } from "../main";
import { Link } from "react-router-dom";
import { parseEther } from "ethers";
import { BrowserProvider } from "ethers";

export function Cesta() {
    const { items, removeItem, updateQuantity, addPedido } = useContext(CestaContext);
    const [account, setAccount] = useState(null);
    const [error, setError] = useState(null);

    const total = items.reduce((sum, item) => sum + item.UnitPrice * item.quantity, 0);

    // Función para conectar y obtener la cuenta actual
    const checkConnection = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    setError(null);
                } else {
                    // Si no hay cuentas, intentar conectar
                    const newAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    setAccount(newAccounts[0]);
                    setError(null);
                }
            } catch (err) {
                setError('Error al conectar con MetaMask');
                console.error(err);
            }
        } else {
            setError('Por favor, instala MetaMask');
        }
    };

    useEffect(() => {
        // Verificar conexión inicial
        checkConnection();

        // Configurar listeners
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    setError(null);
                } else {
                    setAccount(null);
                    setError('Por favor, conecta tu wallet');
                }
            });

            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });

            // Verificar conexión periódicamente
            const interval = setInterval(checkConnection, 1000);

            return () => {
                window.ethereum.removeAllListeners('accountsChanged');
                window.ethereum.removeAllListeners('chainChanged');
                clearInterval(interval);
            };
        }
    }, []);

    const handlePayment = async () => {
        if (!account || !window.ethereum) return;

        const RECIPIENT_ADDRESS = '0x7957790d1246ECB4A392C83d9a07A2eA988A1937';
        
        try {
            const ETH_USD_PRICE = 3000;
            const ethAmount = (total / ETH_USD_PRICE).toFixed(18);
            const weiAmount = parseEther(ethAmount);

            const transactionParameters = {
                to: RECIPIENT_ADDRESS,
                from: account,
                value: weiAmount.toString(),
                gasLimit: '21000',
            };

            try {
                const txHash = await window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [transactionParameters],
                });

                alert(`Transacción enviada! Hash: ${txHash}`);
                
                const provider = new BrowserProvider(window.ethereum);
                await provider.waitForTransaction(txHash);
                
                // Añadir el pedido al historial y limpiar la cesta
                addPedido(items, total, txHash);
                
                alert('¡Pago completado con éxito!');
                
            } catch (error) {
                console.error('Error en la transacción:', error);
                setError('Error al procesar el pago: ' + error.message);
            }

        } catch (error) {
            console.error('Error:', error);
            setError('Error al procesar el pago');
        }
    };

    if (items.length === 0) {
        return (
            <div style={styles.container}>
                <h1>Tu cesta está vacía</h1>
                <Link to="/productos">
                    <button style={styles.button}>Ver productos</button>
                </Link>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1>Tu Cesta</h1>
            
            {/* Sección Metamask */}
            <div style={styles.walletSection}>
                {error && <p style={styles.error}>{error}</p>}
                <p style={styles.accountText}>
                    {account 
                        ? `Cuenta conectada: ${account.substring(0, 6)}...${account.substring(38)}`
                        : 'Conectando a MetaMask...'}
                </p>
            </div>

            {/* Lista de items */}
            {items.map((item) => (
                <div key={item.ProductID} style={styles.item}>
                    <div style={styles.productInfo}>
                        <h3>{item.ProductName}</h3>
                        <p>Precio unitario: ${item.UnitPrice.toFixed(2)}</p>
                    </div>
                    <div style={styles.controls}>
                        <input
                            type="number"
                            min="1"
                            max={item.UnitsInStock}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.ProductID, e.target.value)}
                            style={styles.input}
                        />
                        <button
                            onClick={() => removeItem(item.ProductID)}
                            style={styles.removeButton}
                        >
                            Eliminar
                        </button>
                    </div>
                    <div style={styles.subtotal}>
                        Subtotal: ${(item.UnitPrice * item.quantity).toFixed(2)}
                    </div>
                </div>
            ))}
            
            {/* Total y checkout */}
            <div style={styles.total}>
                <h2>Total: ${total.toFixed(2)}</h2>
                <button 
                    style={{
                        ...styles.checkoutButton,
                        opacity: account ? 1 : 0.5
                    }}
                    disabled={!account}
                    onClick={handlePayment}
                >
                    {account ? 'Pagar con ETH' : 'Conectando a MetaMask...'}
                </button>
            </div>
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
    item: {
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "15px",
        marginBottom: "15px",
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr",
        gap: "15px",
        alignItems: "center"
    },
    productInfo: {
        marginRight: "20px"
    },
    controls: {
        display: "flex",
        gap: "10px",
        alignItems: "center"
    },
    input: {
        width: "60px",
        padding: "5px",
        textAlign: "center"
    },
    removeButton: {
        padding: "5px 10px",
        background: "#dc3545",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer"
    },
    button: {
        padding: "10px 20px",
        background: "#007bff",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        marginTop: "10px"
    },
    subtotal: {
        textAlign: "right",
        fontWeight: "bold"
    },
    total: {
        textAlign: "right",
        marginTop: "20px",
        paddingTop: "20px",
        borderTop: "2px solid #ddd"
    },
    checkoutButton: {
        padding: "10px 20px",
        background: "#28a745",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        marginTop: "10px"
    },
    walletSection: {
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        textAlign: 'center'
    },
    accountInfo: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        flexWrap: 'wrap'
    },
    accountText: {
        margin: '0',
        fontFamily: 'monospace',
        backgroundColor: '#e9ecef',
        padding: '0.5rem',
        borderRadius: '4px'
    },
    walletButton: {
        padding: '10px 20px',
        backgroundColor: '#6c5ce7',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    disconnectButton: {
        padding: '10px 20px',
        backgroundColor: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    error: {
        color: '#e74c3c',
        marginBottom: '1rem'
    }
};