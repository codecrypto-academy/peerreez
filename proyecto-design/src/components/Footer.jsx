import datos from '../datos.json';

function Section({ data }) {
    return (
        <div className="mb-4">
            <h5 className="text-uppercase fw-bold">{data.titulo}</h5>
            <ul className="nav flex-column">
                {data.links.map((link, index) => (
                    <li className="nav-item" key={index}>
                        <a className="nav-link" href={link.url}>
                            {link.titulo}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}


export function Footer() {
    return (
        <div className="d-flex justify-content-between mt-4">
                <div className="fs-4 fw-bold mb-3">{datos.header.nombre}</div>
                {datos.footer.map((item, index) => (
                    <Section key={index} data={item} />
                ))}

        </div>
    );
}