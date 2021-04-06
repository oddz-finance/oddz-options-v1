import { expect } from "chai";
import { BigNumber, utils } from "ethers";

export function shouldBehaveLikeOddzOptionPremiumManager(): void {
  it("Should be able to successfully add an option model", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin);
    await expect(
      optionPremiumManager.addOptionPremiumModel(
        utils.formatBytes32String("B_S"),
        this.oddzPremiumBlackScholes.address,
      ),
    )
      .to.emit(optionPremiumManager, "NewOptionPremiumModel")
      .withArgs(utils.formatBytes32String("B_S"), this.oddzPremiumBlackScholes.address);
  });

  it("Should throw caller has no access to the method while add option model", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin1);
    await expect(
      optionPremiumManager.addOptionPremiumModel(
        utils.formatBytes32String("B_S"),
        this.oddzPremiumBlackScholes.address,
      ),
    ).to.be.revertedWith("caller has no access to the method");
  });

  it("Should throw Invalid premium model address", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin);
    await expect(
      optionPremiumManager.addOptionPremiumModel(
        utils.formatBytes32String("B_S"),
        "0x0000000000000000000000000000000000000000",
      ),
    ).to.be.revertedWith("Invalid premium model address");
  });

  it("Should throw model name already used", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin);
    await optionPremiumManager.addOptionPremiumModel(
      utils.formatBytes32String("B_S"),
      this.oddzPremiumBlackScholes.address,
    );
    await expect(
      optionPremiumManager.addOptionPremiumModel(
        utils.formatBytes32String("B_S"),
        this.oddzPremiumBlackScholes.address,
      ),
    ).to.be.revertedWith("model name already used");
  });

  it("Should be able to successfully disable option model", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin);
    await optionPremiumManager.addOptionPremiumModel(
      utils.formatBytes32String("B_S"),
      this.oddzPremiumBlackScholes.address,
    );

    await expect(optionPremiumManager.disableOptionPremiumModel(utils.formatBytes32String("B_S")))
      .to.emit(optionPremiumManager, "OptionPremiumModelStatusUpdate")
      .withArgs(utils.formatBytes32String("B_S"), false);
  });

  it("Should throw caller has no access to the method while disabling an option model", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin1);
    await expect(optionPremiumManager.disableOptionPremiumModel(utils.formatBytes32String("B_S"))).to.be.revertedWith(
      "caller has no access to the method",
    );
  });

  it("Should throw model doesn't exist while disabling an option model", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin);
    await expect(optionPremiumManager.disableOptionPremiumModel(utils.formatBytes32String("B_S"))).to.be.revertedWith(
      "model doesn't exist",
    );
  });

  it("Should be able to successfully enable option model", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin);
    await optionPremiumManager.addOptionPremiumModel(
      utils.formatBytes32String("B_S"),
      this.oddzPremiumBlackScholes.address,
    );

    await expect(optionPremiumManager.disableOptionPremiumModel(utils.formatBytes32String("B_S")));

    await expect(optionPremiumManager.enableOptionPremiumModel(utils.formatBytes32String("B_S")))
      .to.emit(optionPremiumManager, "OptionPremiumModelStatusUpdate")
      .withArgs(utils.formatBytes32String("B_S"), true);
  });

  it("Should throw caller has no access to the method while enabling an option model", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin1);
    await expect(optionPremiumManager.enableOptionPremiumModel(utils.formatBytes32String("B_S"))).to.be.revertedWith(
      "caller has no access to the method",
    );
  });

  it("Should throw model doesn't exist while enabling an option model", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin);
    await expect(optionPremiumManager.enableOptionPremiumModel(utils.formatBytes32String("B_S"))).to.be.revertedWith(
      "model doesn't exist",
    );
  });

  it("Should be able to successfully set Manager", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin);
    await expect(optionPremiumManager.setManager(this.oddzPremiumBlackScholes.address)).to.emit(
      optionPremiumManager,
      "RoleGranted",
    );
  });

  it("Should throw Invalid manager address while set Manager", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin);
    await expect(optionPremiumManager.setManager(this.accounts.admin)).to.be.revertedWith("Invalid manager address");
  });

  it("Should throw sender must be an admin to grant while set Manager", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin1);
    await expect(optionPremiumManager.setManager(this.oddzPremiumBlackScholes.address)).to.be.revertedWith(
      "sender must be an admin to grant",
    );
  });

  it("Should be able to successfully remove Manager", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin);
    await optionPremiumManager.setManager(this.oddzPremiumBlackScholes.address);
    await expect(optionPremiumManager.removeManager(this.oddzPremiumBlackScholes.address)).to.emit(
      optionPremiumManager,
      "RoleRevoked",
    );
  });

  it("Should throw sender must be an admin to grant while remove Manager", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin1);
    await expect(optionPremiumManager.removeManager(this.oddzPremiumBlackScholes.address)).to.be.revertedWith(
      "sender must be an admin to revoke",
    );
  });

  it("Should be able to successfully add an option model", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin);
    optionPremiumManager.addOptionPremiumModel(utils.formatBytes32String("B_S"), this.oddzPremiumBlackScholes.address);

    await optionPremiumManager.setManager(this.mockPremiumManager.address);

    const mockPremiumManager = await this.mockPremiumManager.connect(this.signers.admin);
    const premium = await mockPremiumManager.getPremium();
    expect(BigNumber.from(premium)).to.equal(2439078096);
  });

  it("Should throw sender must be an admin to grant while get premium", async function () {
    const optionPremiumManager = await this.oddzOptionPremiumManager.connect(this.signers.admin);
    optionPremiumManager.addOptionPremiumModel(utils.formatBytes32String("B_S"), this.oddzPremiumBlackScholes.address);

    const mockPremiumManager = await this.mockPremiumManager.connect(this.signers.admin);
    await expect(mockPremiumManager.getPremium()).to.be.revertedWith("caller has no access to the method");
  });
}
