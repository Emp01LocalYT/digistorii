import {
  IconHome,
  IconDeviceMobile,
  IconAppWindow,
  IconFileTypeXls,
  IconBox,
  IconBrandCashapp,
  IconLayoutDashboard, IconReceipt,
  IconShoppingCartCheck,

} from "@tabler/icons-react";

export default function Features() {
  const features = [
    {
      title: "Instant Online Store",
      description: "Launch a clean, customer-facing website to display products, accept orders, and grow your digital presence effortlessly.",
      icon: IconShoppingCartCheck
    },
    {
      title: "Fast POS Billing",
      description: "Ring up sales in seconds with barcode scanning, instant invoice generation, and smooth over-the-counter billing.",
      icon: IconReceipt
    },
    {
      title: "Bulk Excel Upload",
      description: "Skip the manual data entry. Upload your entire product catalog in one click using a simple Excel spreadsheet.",
      icon: IconFileTypeXls
    },
    {
      title: "Smart Inventory Tracker",
      description: "Monitor stock levels in real time across online orders and physical sales from a unified, centralized dashboard.",
      icon: IconBox
    },
    {
      title: "Universal Checkout & Payments",
      description: "Provide a seamless checkout experience with built-in support for UPI, cards, wallets, and cash tracking.",
      icon: IconBrandCashapp
    },
    {
      title: "Store in Your Pocket",
      description: "Track live sales, manage inventory, and monitor your entire business in real time directly from your smartphone.",
      icon: IconDeviceMobile
    }
  ];

  return (
    <section id="features" className="py-20 relative bg-gray-50 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-70"></div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Run Your Business Online
          </h2>
          <p className="text-lg text-gray-600">
            All features included. No hidden charges or extra plugins needed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))} */}
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <div
                key={index}
                className="group bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <Icon
                  size={32}
                  stroke={1.5}
                  className="text-[#174FEB] group-hover:text-[#93ADF6] transition-colors"
                />
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
}
