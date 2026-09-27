-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "ceremonyButtonLabel" TEXT NOT NULL DEFAULT 'Inaugurate',
ADD COLUMN     "ceremonyDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ceremonyGuestName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ceremonyGuestTitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ceremonyNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ceremonySubtitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ceremonyTitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "inauguratedAt" TIMESTAMP(3),
ADD COLUMN     "inaugurationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inaugurationKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "showInaugurationPlaque" BOOLEAN NOT NULL DEFAULT true;

