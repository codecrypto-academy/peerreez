import { Logo } from './Logo';
import datos from '../datos.json';

export function Header() {
    return (
        <header className="bg-light py-2 text-dark d-flex justify-content-between align-items-center shadow-sm">
            <div className="d-flex align-items-center">
                <Logo />
                <p className="fs-4 mb-0 ms-2">{datos.header.nombre}</p>
            </div>
            <nav>
                {datos.header.links.map((item, index) => (
                    <a 
                        key={index} 
                        className="mx-3 text-decoration-none text-dark hover:text-primary" 
                        href={item.url}
                    >
                        {item.texto}
                    </a>
                ))}
            </nav>
        </header>
    );
}
