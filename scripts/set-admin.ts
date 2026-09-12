import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const identifier = process.argv[2];
const roleArg = (process.argv[3] || "ADMIN").toUpperCase();

async function main() {
  if (!identifier) {
    console.log("\n📋 Danh sách tài khoản hiện tại trong hệ thống:\n");
    const users = await prisma.user.findMany({
      select: { id: true, email: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });

    console.table(
      users.map((u) => ({
        ID: u.id,
        Email: u.email,
        Username: u.username,
        Role: u.role
      }))
    );

    console.log("\n💡 Cú pháp để phân quyền:");
    console.log("   npm run make-admin <email-hoặc-username> [ADMIN | SUPER_ADMIN | USER]\n");
    console.log("Ví dụ:");
    console.log("   npm run make-admin nguyenduy@gmail.com ADMIN\n");
    return;
  }

  const validRoles = ["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];
  if (!validRoles.includes(roleArg)) {
    console.error(`❌ Vai trò không hợp lệ: "${roleArg}". Các vai trò hợp lệ: ${validRoles.join(", ")}`);
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { username: { equals: identifier, mode: "insensitive" } }
      ]
    }
  });

  if (!user) {
    console.error(`❌ Không tìm thấy tài khoản với email hoặc username: "${identifier}"`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: roleArg as any }
  });

  console.log(`\n✅ THÀNH CÔNG! Đã cập nhật vai trò cho tài khoản:`);
  console.log(`   - Email: ${updated.email}`);
  console.log(`   - Username: ${updated.username}`);
  console.log(`   - Vai trò mới: 👑 ${updated.role}\n`);
}

main()
  .catch((err) => {
    console.error("Lỗi:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
