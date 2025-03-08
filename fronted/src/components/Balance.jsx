import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

function Balance() {
  const location = useLocation();
  const address = location.state?.data || '';
  const [balanceData, setBalanceData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBalanceData = async () => {
      if (!address) return;
      
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:3333/balance/${address}`);
        if (!response.ok) {
          throw new Error('Error al obtener los datos del balance');
        }
        const data = await response.json();
        setBalanceData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBalanceData();
  }, [address]);

  if (loading) {
    return <div>Cargando información del balance...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">Error: {error}</div>;
  }

  if (!address) {
    return <div>No se ha especificado una dirección</div>;
  }

  return (
    <div className="container mt-4">
      <h2>Información del Balance</h2>
      {balanceData && (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Dirección: {address}</h5>
            <div className="card-text">
              <p><strong>Balance en Wei:</strong> {balanceData.balance}</p>
              <p><strong>Balance en ETH:</strong> {balanceData.ethers}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Balance; 