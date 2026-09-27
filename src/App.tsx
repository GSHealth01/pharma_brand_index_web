import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useGlobalRipple } from "./lib/motion";
import { StoreProvider } from "./lib/store";
import Brands from "./pages/Brands";
import Home from "./pages/Home";
import { About, Favorites, More, NotFound, Privacy, Terms } from "./pages/Info";
import Product from "./pages/Product";
import Search from "./pages/Search";
import Welcome from "./pages/Welcome";

function GlobalEffects() {
  useGlobalRipple();
  return null;
}

export default function App() {
  return (
    <StoreProvider>
      <GlobalEffects />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route element={<Layout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/brands/:generic" element={<Brands />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/more" element={<More />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
