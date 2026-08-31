export function ConfirmationPanel({
  blocked,
  confirm,
}: {
  blocked: boolean;
  confirm: () => Promise<void>;
}) {
  return (
    <section className="card">
      <h2>ยืนยันข้อมูลปัจจุบัน</h2>
      <p className="muted">
        ตรวจคำแนะนำทั้งหมดก่อนยืนยัน ข้อมูลจะยังไม่เผยแพร่อัตโนมัติ
      </p>
      {blocked ? (
        <p>ยังมีข้อมูลสำคัญที่ต้องตรวจสอบ</p>
      ) : (
        <button onClick={() => void confirm()}>ยืนยันข้อมูลปัจจุบัน</button>
      )}
    </section>
  );
}
