import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

function Block() {
  const location = useLocation();
  const blockNumber = location.state?.data || '';
  const [blockData, setBlockData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBlockData = async () => {
      if (!blockNumber) return;
      
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:3333/bloque/${blockNumber}`);
        if (!response.ok) {
          throw new Error('Error al obtener los datos del bloque');
        }
        const data = await response.json();
        setBlockData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockData();
  }, [blockNumber]);

  if (loading) {
    return <div>Cargando información del bloque...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">Error: {error}</div>;
  }

  if (!blockNumber) {
    return <div>No se ha especificado un número de bloque</div>;
  }

  return (
    <div className="container mt-4">
      <h2>Información del Bloque {blockNumber}</h2>
      {blockData && (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Bloque #{blockData.number}</h5>
            <div className="card-text">
              <p><strong>Hash:</strong> {blockData.hash}</p>
              <p><strong>Parent Hash:</strong> {blockData.parentHash}</p>
              <p><strong>Timestamp:</strong> {new Date(Number(blockData.timestamp) * 1000).toLocaleString()}</p>
              <p><strong>Nonce:</strong> {blockData.nonce}</p>
              <p><strong>Dificultad:</strong> {blockData.difficulty}</p>
              <p><strong>Gas Usado:</strong> {blockData.gasUsed}</p>
              <p><strong>Gas Límite:</strong> {blockData.gasLimit}</p>
              <p><strong>Número de Transacciones:</strong> {blockData.transactions.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Block; 