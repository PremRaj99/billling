import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useScrollRestore = (hasDataLoaded = true) => {
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(
        "scroll_pos_" + location.pathname,
        window.scrollY.toString()
      );
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (hasDataLoaded) {
      const savedScroll = sessionStorage.getItem("scroll_pos_" + location.pathname);
      if (savedScroll) {
        const scrollY = parseInt(savedScroll, 10);
        setTimeout(() => {
          window.scrollTo(0, scrollY);
        }, 80);
      }
    }
  }, [hasDataLoaded, location.pathname]);
};
