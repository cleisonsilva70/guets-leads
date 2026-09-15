"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, type PanInfo } from "framer-motion";

const teaserImages = [
  { src: "/products/teaser/1.png", alt: "Peça de moda fitness Guets 1" },
  { src: "/products/teaser/2.png", alt: "Peça de moda fitness Guets 2" },
  { src: "/products/teaser/3.png", alt: "Peça de moda fitness Guets 3" },
  { src: "/products/teaser/4.png", alt: "Peça de moda fitness Guets 4" },
  { src: "/products/teaser/5.png", alt: "Peça de moda fitness Guets 5" },
];

const AUTO_ADVANCE_MS = 4200;
const SWIPE_THRESHOLD = 60;
/** Deslocamento lateral por passo (% da largura do card) e leve giro 2D —
 * dão a sensação de arco/círculo atrás da peça principal. Deliberadamente
 * 2D (sem rotateY/perspective): a versão 3D tinha um bug de composição do
 * Chrome onde, junto com overflow-hidden + border-radius + opacity, o card
 * de trás "vazava" por cima do da frente. */
const X_STEP_PERCENT = 27;
const ROTATE_STEP_DEG = 8;

/** Distância circular sinalizada mais curta entre i e active (ex: N=4 -> -1, 0, 1, 2). */
function getOffset(i: number, active: number, total: number) {
  let diff = ((i - active) % total + total) % total;
  if (diff > total / 2) diff -= total;
  return diff;
}

/**
 * Teaser visual de peças reais como um carrossel giratório: a peça ativa
 * fica totalmente de frente, as demais ficam menores, giradas e afastadas
 * para os lados, formando um arco atrás dela. Arrastar de lado troca a peça
 * ativa e todo o arco se rearranja. Gera desejo/prova social antes do quiz
 * sem "entregar o catálogo" (sem preço, sem navegação, sem link de compra
 * — ver seção 62 do briefing comercial).
 */
export function ProductTeaser() {
  const [active, setActive] = useState(0);
  const total = teaserImages.length;

  const advance = useCallback((dir: number) => setActive((prev) => (prev + dir + total) % total), [total]);

  useEffect(() => {
    const timer = setInterval(() => advance(1), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [advance]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -SWIPE_THRESHOLD) advance(1);
    else if (info.offset.x > SWIPE_THRESHOLD) advance(-1);
  }

  return (
    <div className="mx-auto w-full max-w-[280px] sm:max-w-[340px] lg:mx-0">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
        Conheça nossa Coleção Gabriela
      </p>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={handleDragEnd}
        className="relative aspect-3/4 cursor-grab touch-pan-y active:cursor-grabbing"
      >
        {teaserImages.map((img, i) => {
          const offset = getOffset(i, active, total);
          const abs = Math.abs(offset);
          const isFront = offset === 0;

          return (
            <motion.div
              key={img.src}
              animate={{
                x: `${offset * X_STEP_PERCENT}%`,
                rotate: offset * ROTATE_STEP_DEG,
                scale: Math.max(0.75, 1 - abs * 0.15),
                opacity: Math.max(0.4, 1 - abs * 0.3),
              }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              style={{ zIndex: total - abs }}
              className="absolute inset-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(min-width: 1024px) 340px, 280px"
                className="pointer-events-none object-cover"
                priority={i === 0}
                aria-hidden={!isFront}
              />
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-3 flex justify-center gap-1.5">
        {teaserImages.map((img, i) => (
          <button
            key={img.src}
            type="button"
            aria-label={`Ver peça ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? "w-5 bg-white" : "w-1.5 bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
