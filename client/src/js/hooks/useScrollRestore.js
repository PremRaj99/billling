import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export const useScrollRestore = (hasDataLoaded = true) => {
  const location = useLocation();
  const isRestoring = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (hasDataLoaded && !isRestoring.current) {
        sessionStorage.setItem(
          "scroll_pos_" + location.pathname,
          window.scrollY.toString()
        );
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location.pathname, hasDataLoaded]);

  useEffect(() => {
    if (hasDataLoaded) {
      const savedScroll = sessionStorage.getItem("scroll_pos_" + location.pathname);
      if (savedScroll) {
        const scrollY = parseInt(savedScroll, 10);
        isRestoring.current = true;
        setTimeout(() => {
          window.scrollTo(0, scrollY);
          setTimeout(() => {
            isRestoring.current = false;
          }, 100);
        }, 80);
      }
    }
  }, [hasDataLoaded, location.pathname]);
};
