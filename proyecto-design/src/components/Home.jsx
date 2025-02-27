import { Carrousel } from "./Carrousel";
import { Precios } from "./Precios";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function Home() {
    return (
        <div className="container-fluid">
            <Header />
            <div className="my-4">
                <Carrousel />
            </div>
            <div className="my-5">
                <Precios />
            </div>
            <Footer />
        </div>
    );
}
