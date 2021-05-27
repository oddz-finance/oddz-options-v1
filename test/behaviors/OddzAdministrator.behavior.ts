import { expect } from "chai";
import { BigNumber, utils, constants } from "ethers";
import { OddzAssetManager, MockERC20 } from "../../typechain";
import { Signer } from "@ethersproject/abstract-signer";

const addAssetPair = async (
  oddzAssetManager: OddzAssetManager,
  admin: Signer,
  usdcToken: MockERC20,
  ethToken: MockERC20,
) => {
  const oam = await oddzAssetManager.connect(admin);
  await oam.addAsset(utils.formatBytes32String("USD"), usdcToken.address, 8);
  await oam.addAsset(utils.formatBytes32String("ETH"), ethToken.address, 8);
  await oam.addAssetPair(
    utils.formatBytes32String("ETH"),
    utils.formatBytes32String("USD"),
    BigNumber.from(utils.parseEther("0.01")),
    2592000,
    86400,
  );
};

export function shouldBehaveLikeOddzAdministrator(): void {
  it("should revert set update minimum amount for non owner", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin1);
    await expect(oddzAdministrator.updateMinimumAmount(BigNumber.from(utils.parseEther("1100"))))
        .to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should revert set update minimum amount for invalid amount", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await expect(oddzAdministrator.updateMinimumAmount(BigNumber.from(utils.parseEther("999"))))
        .to.be.revertedWith("Administrator: invalid deposit frequency");
  });

  it("should set update minimum amount for valid amount", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await oddzAdministrator.updateMinimumAmount(BigNumber.from(utils.parseEther("1100")));
    expect(await oddzAdministrator.minimumAmount()).to.equal(BigNumber.from(utils.parseEther("1100")));
        
  });

  it("should revert change gasless facililatator for non owner", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin1);
    await expect(oddzAdministrator.changeGaslessFacilitator(this.accounts.admin1))
        .to.be.revertedWith("Ownable: caller is not the owner")
  });

  it("should change gasless facililatator", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await oddzAdministrator.changeGaslessFacilitator(this.accounts.admin1);
    expect(await oddzAdministrator.gaslessFacilitator()).to.equal(this.accounts.admin1);
  });

  it("should revert change maintenance facililatator for non owner", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin1);
    await expect(oddzAdministrator.changeMaintenanceFacilitator(this.accounts.admin1))
        .to.be.revertedWith("Ownable: caller is not the owner")
  });

  it("should change maintenance facililatator", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await oddzAdministrator.changeMaintenanceFacilitator(this.accounts.admin1);
    expect(await oddzAdministrator.maintenanceFacilitator()).to.equal(this.accounts.admin1);
  });

  it("should revert update deadline for non owner", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin1);
    await expect(oddzAdministrator.updateDeadline(60))
        .to.be.revertedWith("Ownable: caller is not the owner")
  });

  it("should revert update deadline for invalid value", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await expect(oddzAdministrator.updateDeadline(31 * 60))
        .to.be.revertedWith("Administrator: invalid deadline")
  });

  it("should update deadline", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await oddzAdministrator.updateDeadline(30 * 60);
    expect(await oddzAdministrator.deadline()).to.equal(30 * 60);
  });

  
}
