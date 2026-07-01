import {
  IconHome,
  IconDeviceMobile,
  IconAppWindow,
  IconFileTypeXls,
  IconBox,
  IconBrandCashapp,
  IconLayoutDashboard,
  IconShoppingCartCheck,
  
} from "@tabler/icons-react";

export default function Features() {
  const features = [
    {
      title: "Instant Online Store",
      description: "Your customers get a clean shopping website to browse products, add to cart, and place orders anytime.",
      icon: IconShoppingCartCheck
    },
    {
      title: "Operational Dashboard for Owners",
      description: "Manage products, pricing, customers, invoices, and sales — from a single dashboard.",
      icon: IconLayoutDashboard
    },
    {
      title: "Upload Products via Excel",
      description: "No need to add products one-by-one. Upload an Excel sheet and your store is ready.",
      icon: IconFileTypeXls
    },
    {
      title: "Orders + Customer Data in One Place",
      description: "Every order and customer detail automatically appears in your admin panel.",
      icon: IconBox
    },
    {
      title: "Payments & Checkout",
      description: "Accept orders with smooth checkout and payment support (UPI / cards / wallet support can be enabled).",
      icon: IconBrandCashapp
    },
    {
      title: "Works on Mobile",
      description: "Your website and admin dashboard work smoothly on phone and desktop.",
      icon: IconDeviceMobile
    },
    {
      title: "Custom Website Name",
      description: "Choose your store name and get your own business website link.",
      icon: IconAppWindow
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
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
