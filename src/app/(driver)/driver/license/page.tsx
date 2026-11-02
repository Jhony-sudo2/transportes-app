import { DriverLicenseView } from "@/components/domain/DriverLicenseView";
export default function DriverLicensePage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6 px-5 py-10">
      <p className="tg-eyebrow">CONDUCTOR / LICENCIA</p>
      <h1 className="text-3xl font-semibold">Mi licencia</h1>
      <DriverLicenseView />
    </section>
  );
}
