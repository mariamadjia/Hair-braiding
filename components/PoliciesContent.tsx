const sections = [
   {
       id: "booking-essentials",
       title: "Booking Essentials",
       items: [
           {
               anchor: "booking",
               heading: "Booking",
               body: [
                   "All appointments must be booked online or by message — no walk-ins.",
                   "A non-refundable deposit of $25–$50 (depending on style) is required to secure your appointment.",
                   "The remaining balance is due in cash or via Cash App/Zelle at the start of your appointment.",
                   "Appointments are confirmed only after your deposit is received.",
               ],
           },
           {
               anchor: "late-policy",
               heading: "Late Policy",
               body: [
                   "Please arrive on time.",
                   "There is a 15-minute grace period. After that, a $15 late fee will be added.",
                   "After 30 minutes, your appointment may be canceled and your deposit forfeited.",
               ],
           },
           {
               anchor: "rescheduling",
               heading: "Rescheduling & Cancellations",
               body: [
                   "You may reschedule once using your deposit if you give at least 48 hours’ notice.",
                   "Cancellations made within 48 hours or no-shows will lose their deposit.",
                   "No same-day cancellations are accepted.",
               ],
           },
       ],
   },
   {
       id: "hair-and-guests",
       title: "Hair & Guests",
       items: [
           {
               anchor: "hair-prep",
               heading: "Hair Preparation",
               body: [
                   "Please come with your hair clean, detangled, and blown out (no products or oils).",
                   "If hair requires extra detangling or blow-drying, a $20 service fee will apply.",
                   "If your hair is not properly prepped, your appointment may be rescheduled.",
               ],
           },
           {
               anchor: "hair-provided",
               heading: "Hair Provided",
               body: [
                   "Hair is provided for all styles unless stated otherwise.",
                   "You may bring your own hair if you prefer — please confirm the brand and length beforehand.",
               ],
           },
           {
               anchor: "guests",
               heading: "Extra Guests & Kids",
               body: [
                   "No extra guests or children unless being serviced.",
                   "Please respect the calm and private environment of the salon.",
               ],
           },
       ],
   },
   {
       id: "media-and-thanks",
       title: "Media & Appreciation",
       items: [
           {
               anchor: "photos",
               heading: "Photos & Promotion",
               body: [
                   "ZBoo Braids reserves the right to take photos and videos of finished styles for promotional use.",
                   "If you prefer not to be photographed, please let us know before your appointment.",
               ],
           },
           {
               anchor: "thank-you",
               heading: "Thank You",
               body: [
                   "Thank you for choosing ZBoo Braids — where elegance meets precision.",
                   "We appreciate your trust and can’t wait to make you look and feel your best!",
               ],
           },
       ],
   },
];


export default function PoliciesContent() {
   return (
       <div className="relative overflow-hidden bg-gradient-to-b from-[#fff6df] via-[#fffdf4] to-[#ffffff]">
           <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
               <div className="text-center mb-16 md:mb-20">
                   <p className="text-xs uppercase tracking-[0.4em] text-neutral-500 mb-4">Guidelines</p>
                   <h2 className="text-4xl md:text-6xl font-light tracking-tight text-neutral-900">
                       Salon <span className="font-serif italic">Policies</span>
                   </h2>
                   <p className="mx-auto mt-6 max-w-2xl text-base text-neutral-600 leading-relaxed">
                       Please review the guidelines before booking. These policies help us offer a seamless, respectful experience for every guest.
                   </p>
               </div>


               <div className="space-y-12 md:space-y-16">
                  {sections.map((section) => (
                      <section key={section.id} id={section.id} className="rounded-sm border border-[#f1e3c8] bg-[#fffdf7] p-8 sm:p-10 md:p-12 shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
                           <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
                               <div className="md:w-56 md:flex-shrink-0">
                                   <p className="text-xs font-medium uppercase tracking-[0.35em] text-neutral-600">{section.title}</p>
                                   <div className="mt-4 h-px w-12 bg-neutral-300" />
                              </div>
                              <div className="grid gap-6 md:flex-1">
                                  {section.items.map((item) => (
                                      <div
                                          key={item.heading}
                                          id={item.anchor}
                                          className="relative overflow-hidden border-l-2 border-[#e4d6b4] bg-white/80 py-6 pr-6 pl-10 transition-all duration-300 hover:border-[#d8c79d] hover:bg-white"
                                      >
                                           <h3 className="text-sm font-medium uppercase tracking-[0.25em] text-neutral-700">
                                               {item.heading}
                                           </h3>
                                           <ul className="mt-4 space-y-3 text-sm md:text-base leading-relaxed text-neutral-600">
                                               {item.body.map((point, index) => (
                                                   <li key={index} className="flex gap-3">
                                                       <span className="mt-2 inline-block size-1 flex-shrink-0 rounded-full bg-neutral-400" />
                                                       <span>{point}</span>
                                                   </li>
                                               ))}
                                           </ul>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       </section>
                   ))}
               </div>
           </div>
           {/* Decorative elements */}
           <div className="pointer-events-none absolute -top-20 right-10 h-56 w-56 rounded-full bg-neutral-200/40 blur-3xl" aria-hidden="true" />
       </div>
   );
}





