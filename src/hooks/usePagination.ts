import { useEffect, useMemo, useState } from "react";

type PageNumber = number | "...";

type UsePaginationOptions<T> = {
  data: T[];
  initialPage?: number;
  initialItemsPerPage?: number;
  resetDeps?: ReadonlyArray<unknown>;
};

export function usePagination<T>({
  data,
  initialPage = 1,
  initialItemsPerPage = 20,
  resetDeps = [],
}: UsePaginationOptions<T>) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(Math.max(prev, 1), totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, ...resetDeps]);

  const paginatedData = useMemo(
    () =>
      data.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [currentPage, data, itemsPerPage]
  );

  const pageNumbers = useMemo<PageNumber[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages: PageNumber[] = [1];
    const left = Math.max(2, currentPage - 1);
    const right = Math.min(totalPages - 1, currentPage + 1);

    if (left > 2) pages.push("...");
    for (let page = left; page <= right; page += 1) {
      pages.push(page);
    }
    if (right < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  const showingFrom = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, totalItems);

  const goToPage = (page: number) => {
    if (!Number.isFinite(page)) return;
    const safePage = Math.min(Math.max(Math.trunc(page), 1), totalPages);
    setCurrentPage(safePage);
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  return {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalItems,
    totalPages,
    paginatedData,
    pageNumbers,
    showingFrom,
    showingTo,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  };
}
