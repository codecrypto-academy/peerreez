import { Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';

function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.length === 66) {
      navigate('/tx', { state: { data: searchQuery } });
    } else if (searchQuery.length === 42) {
      navigate('/balance', { state: { data: searchQuery } });
    } else if (/^\d+\.?\d*$/.test(searchQuery)) {
      navigate('/bloque', { state: { data: searchQuery } });
    }
  };

  return (
    <div className="container mt-4">
      <header>
        <h1 className="text-center mb-4">Blockchain Explorer</h1>
      </header>

      <main className="mt-4">
        <div className="row justify-content-center mb-4">
          <div className="col-md-8">
            <form onSubmit={handleSubmit} className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por bloque, transacción o dirección..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Buscar
              </button>
            </form>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

export default Home;
