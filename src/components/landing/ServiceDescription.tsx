export default function ServiceDescription() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            A Complete Website + Store Setup for Your Business
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
            GetYourWebsite helps business owners launch a professional website with a customer shopping store 
            and a private admin dashboard. You can manage products, pricing, invoices, customers, and orders 
            from one place — and your customers can browse, add to cart, and pay online.
          </p>
        </div>

        {/* Bullet Points */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {[
            "Professional website + online store",
            "Admin dashboard for managing everything",
            "Customer orders go directly into your system",
            "Works on mobile, tablet, and desktop"
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-700 font-medium">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}