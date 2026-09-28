import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const isMastersStudyRoute = (path) =>
      /^\/masters-bible-study(?:\/\d{4}-\d{2}-\d{2})?$/.test(path);
    const changingStudyWeek =
      previousPathname.current !== pathname &&
      isMastersStudyRoute(previousPathname.current) &&
      isMastersStudyRoute(pathname);

    if (!changingStudyWeek) {
      window.scrollTo(0, 0);
    }

    previousPathname.current = pathname;
  }, [pathname]);

  return null;
}

export default ScrollToTop;
