import React from 'react';
import datos from '../datos.json';

export function CardPrecios({ titulo, precio, por, textBoton, features }) {
    return (
        <div className="card mb-4" style={{ width: '18rem' }}>
            <div className="card-body">
                <h5 className="card-title">{titulo}</h5>
                <h6 className="card-subtitle mb-2 text-muted">{precio} <span>{por}</span></h6>
                <button className="btn btn-primary">{textBoton}</button>
                <ul className="list-group list-group-flush mt-3">
                    {features.map((feature, index) => (
                        <li key={index} className="list-group-item">{feature}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export function Precios() {
    return (
        <div className="container my-5">
            <h2 className="text-center mb-4">Prices</h2>
            <div className="row">
                {datos.precios.map((precioData, index) => (
                    <div className="col-md-4" key={index}>
                        <CardPrecios 
                            titulo={precioData.titulo}
                            precio={precioData.precio}
                            por={precioData.por}
                            textBoton={precioData.textBoton}
                            features={precioData.features}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
