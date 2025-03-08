import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

function Transaction() {
  const location = useLocation();
  const txHash = location.state?.data || '';
  const [txData, setTxData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTransactionData = async () => {
      if (!txHash) return;
      
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:3333/tx/${txHash}`);
        if (!response.ok) {
          throw new Error('Error al obtener los datos de la transacción');
        }
        const data = await response.json();
        setTxData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionData();
  }, [txHash]);

  if (loading) {
    return <div>Cargando información de la transacción...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">Error: {error}</div>;
  }

  if (!txHash) {
    return <div>No se ha especificado un hash de transacción</div>;
  }

  return (
    <div className="container mt-4">
      <h2>Información de la Transacción</h2>
      {txData && (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Hash: {txData.hash}</h5>
            <div className="card-text">
              <p><strong>Bloque:</strong> {txData.blockNumber}</p>
              <p><strong>De:</strong> {txData.from}</p>
              <p><strong>Para:</strong> {txData.to}</p>
              <p><strong>Valor:</strong> {txData.value} Wei</p>
              <p><strong>Gas Price:</strong> {txData.gasPrice} Wei</p>
              <p><strong>Gas:</strong> {txData.gas}</p>
              <p><strong>Nonce:</strong> {txData.nonce}</p>
              <p><strong>Input Data:</strong> 
                <span className="text-break">{txData.input}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transaction; 