export default function Contact() {
  return (
    <section id="contact" className="py-16 relative bg-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-50/80 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-50/80 rounded-full blur-3xl"></div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f8f9fa_1px,transparent_1px),linear-gradient(to_bottom,#f8f9fa_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Get In Touch</h2>
          <p className="text-gray-600">Have questions? Reach out and we'll get back to you shortly.</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 max-w-2xl mx-auto">
          <p className="text-sm text-gray-700 mb-4">
            Email: <a href="mailto:support@digistorii.com" className="text-blue-600">support@digistorii.com</a>
          </p>
          <p className="text-sm text-gray-700">
            Phone: <a href="tel:+919900000000" className="text-blue-600">+91 99000 00000</a>
          </p>
        </div>
      </div>
    </section>
  );
}
