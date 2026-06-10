"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSidebar } from "../context/SidebarContext";
import { useParams, usePathname } from "next/navigation";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  FileIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
  PaperPlaneIcon,IconSettings,
} from "../icons/index";

import {
  Squares2X2Icon,
  ArrowsRightLeftIcon,
  Cog6ToothIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";


type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    // subItems: [{ name: "Ecommerce", path: "/", pro: false }],
    path: "/", // go straight to dashboard
  },
  
  {   name: "Purchase",
      icon: <FileIcon />,
      subItems: [
       { name: "Supplier", path: "/purchase/supplier", pro: false },
       {name: "Purchase Order", path: "/transactions/purchase", pro: false },
       {name: "Purchase Order Approval", path: "/transactions/purchase-approval", pro: false },
       {name: "GRN", path: "/transactions/grn", pro: false },
      ],
  },
  {
      name: "Inventory",
      icon: <BoxCubeIcon />,
      subItems: [
      { name: "Products", path: "/inventory/products", pro: false },
      // { name: "Image Master", path: "/inventory/image-master", pro: false },
      { name: "Image Master", path: "/inventory/image-master-v2", pro: false },
      // { name: "Add Product", path: "/inventory/product/add-products", pro: false },
      { name: "Opening Stock" , path :"/inventory/opening-stock" ,pro: false},
     
    ],
  },
  {   name: "Sales",
      icon: <PaperPlaneIcon />,
      subItems: [
         {name: "Customer", path: "/sales/customer", pro: false },
         { name: "Pricing", path: "/inventory/pricing", pro: false },
         { name: "Discount Schemes", path: "/inventory/discounts", pro: false },
         {name: "Sales Billing" ,path:"/transactions/sales",pro:false}
      ],
  },
  {
      name: "Reports",
      icon: <TableIcon />,
      subItems: [
        { name: "Stock Ledger", path: "/reports/stock-ledger-report", pro: false },
        { name: "PO Summary Report", path: "/reports/po-summary-report", pro: false },
        { name: "PO Items Report", path: "/reports/po-items-report", pro: false },
      ],
  },
  {
      name: "Settings",
      icon: <IconSettings />,
      subItems: [
      {name: "Categories" , path:"/inventory/categories" ,pro:false},
      {name: "Materials" , path : "/inventory/materials" , pro: false},
      { name: "UOM", path: "/inventory/uom", pro: false },
      { name: "Tax", path: "/inventory/tax", pro: false },
      { name: "Payment Modes", path: "/inventory/payment-mode", pro: false },
      { name: "Payment Terms", path: "/inventory/payment-terms", pro: false },
      // { name: "Currencies", path: "/inventory/currencies", pro: false },
      { name: "Currencies", path: "/inventory/currency-rate", pro: false },
      { name: "Location", path: "/inventory/location", pro: false },
      { name: "Warehouse", path: "/inventory/warehouse", pro: false },
      { name: "Locator", path: "/inventory/locator", pro: false },
      { name: "Despatch Terms", path: "/inventory/despatch-terms", pro: false },
      { name: "Company Settings", path: "/inventory/company-settings", pro: false },
      { name: "User Settings", path: "/inventory/user-settings", pro: false },
      ],
  }
  // {
  //   name: "Transactions",
  //   icon: <ArrowsRightLeftIcon className="w-5 h-5" />,
  //   subItems: [
  //     { name: "Purchase", path: "/transactions/purchase", pro: false },
  //   ],
  // },
  
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  
  // Replace the pathname.split logic with useParams
  const params = useParams();
  const company = params.company as string || "";

  const [openSubmenu, setOpenSubmenu] = useState<{
    // type: "main" | "others";
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = useCallback((path: string) => path === pathname, [pathname]);
  const isActive = useCallback((path: string) => {
  const fullPath = `/${company}${path}`;
  // Check if the current pathname is exactly the full path 
  // or if it's the root dashboard
  return pathname === fullPath || (path === "/" && pathname === `/${company}`);
}, [pathname, company]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  // useEffect(() => {
  //   // Open submenu if current path matches any subItem
  //   let submenuMatched = false;
  //   ["main", "others"].forEach((menuType) => {
  //     const items = menuType === "main" ? navItems : othersItems;
  //     items.forEach((nav, index) => {
  //       if (nav.subItems) {
  //         nav.subItems.forEach((subItem) => {
  //           if (isActive(subItem.path)) {
  //             setOpenSubmenu({ type: menuType as "main" | "others", index });
  //             submenuMatched = true;
  //           }
  //         });
  //       }
  //     });
  //   });

  //   if (!submenuMatched) {
  //     setOpenSubmenu(null);
  //   }
  // }, [pathname, isActive]);

  useEffect(() => {
    // Set submenu heights when open
    if (openSubmenu) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      const el = subMenuRefs.current[key];
      if (el) {
        setSubMenuHeight((prev) => ({ ...prev, [key]: el.scrollHeight || 0 }));
      }
    }
  }, [openSubmenu]);

  const renderMenuItems = (navItems: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <>
              <button
                onClick={() => handleSubmenuToggle(index, menuType)}
                className={`menu-item group ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-active"
                    : "menu-item-inactive"
                } cursor-pointer ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                }`}
              >
                <span
                  className={`${
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronDownIcon
                    className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                      openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                        ? "rotate-180 text-brand-500"
                        : ""
                    }`}
                  />
                )}
              </button>

              {/* Submenu */}
              <div
                ref={(el) => {
                  subMenuRefs.current[`${menuType}-${index}`] = el || null;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height:
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? `${subMenuHeight[`${menuType}-${index}`]}px`
                      : "0px",
                }}
              >
                <ul className="mt-2 space-y-1 ml-9">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        href={`/${company}${subItem.path}`}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        {subItem.name}
                        <span className="flex items-center gap-1 ml-auto">
                          {subItem.new && (
                            <span
                              className={`ml-auto ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                            >
                              new
                            </span>
                          )}
                          {subItem.pro && (
                            <span
                              className={`ml-auto ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                            >
                              pro
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            nav.path && (
              <Link
                href={`/${company}${nav.path}`}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href={`/${company || ""}/dashboard`}>
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="bg-blue-600 rounded-lg w-36 h-10 flex items-center justify-center text-white font-bold text-lg">
              {company.charAt(0).toUpperCase() + company.slice(1)}
            </div>
          ) : (
            <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold text-lg">
              {company.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      </div> */}
      <div
        className="py-8 flex items-center gap-3">
        <Link href={`/${company || ""}/dashboard`} className="flex items-center gap-3">
          {/* Icon */}
    <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold text-lg">
      {company.charAt(0).toUpperCase()}
    </div>

    {/* Company Name */}
    {(isExpanded || isHovered || isMobileOpen) && (
      <span className="text-lg font-semibold text-gray-800 dark:text-white">
        {company.charAt(0).toUpperCase() + company.slice(1)}
      </span>
    )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>{renderMenuItems(navItems, "main")}</div>

            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                
              </h2>
              
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
