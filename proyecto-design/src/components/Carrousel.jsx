import 'bootstrap/dist/css/bootstrap.min.css';
import { useState } from 'react';

export function Carrousel() {
    const [slides] = useState([
        {
            image: '/img1.jpg',
            text: 'Innnovation',
        },
        {
            image: '/img3.jpg',
            text: 'Tecnology',
        },
        {
            image: '/img4.jpg',
            text: 'Progress',
        },
    ]);

    return (
        <div id="carouselExample" className="carousel slide" data-bs-ride="carousel">
            <div className="carousel-inner">
                {slides.map((slide, index) => (
                    <div className={`carousel-item ${index === 0 ? 'active' : ''}`} key={index}>
                        <img src={slide.image} className="d-block w-100" alt={`Slide ${index + 1}`} style={{ height: '400px', objectFit: 'cover' }} />
                        <div className="carousel-caption d-none d-md-block">
                            <h5>{slide.text}</h5>
                        </div>
                    </div>
                ))}
            </div>
            <button className="carousel-control-prev" type="button" data-bs-target="#carouselExample" data-bs-slide="prev">
                <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                <span className="visually-hidden">Previous</span>
            </button>
            <button className="carousel-control-next" type="button" data-bs-target="#carouselExample" data-bs-slide="next">
                <span className="carousel-control-next-icon" aria-hidden="true"></span>
                <span className="visually-hidden">Next</span>
            </button>
        </div>
    );
}
