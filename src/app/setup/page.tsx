import SetupForm from "../../components/SetupForm";

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex justify-center items-start p-10">
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-3xl p-10">
        <SetupForm />
      </div>
    </div>
  );
}