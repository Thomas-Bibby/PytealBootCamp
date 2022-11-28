from pyteal import *
from pyteal.ast.bytes import Bytes
from pyteal_helpers import program


def approval():
    # add local scratch var
    tmpCount = ScratchVar(TealType.uint64)

    # Functions
    @Subroutine(TealType.none)
    def depositBankingPool():
        return Seq(
            # basic sanity checks
            program.check_self(
                group_size=Int(2),
                group_index=Int(0),
            ),
            program.check_rekey_zero(2),
            Assert(
                And(
                    # second transaction is banking deposit payment
                    Gtxn[1].type_enum() == TxnType.Payment,
                    Gtxn[1].receiver() == Global.current_application_address(),
                    Gtxn[1].close_remainder_to() == Global.zero_address(),

                    # commitment
                    Txn.application_args.length() == Int(1),
                )
            ),
            tmpCount.store(App.globalGet(Bytes("BankingPool"))),
            App.globalPut(Bytes("BankingPool"), tmpCount.load() + Gtxn[1].amount()),
            Approve(),
        )

    @Subroutine(TealType.none)
    def withdrawBankingPool():
        return Seq(
            # basic sanity checks
            program.check_self(
                group_size=Int(1),
                group_index=Int(0),
            ),
            program.check_rekey_zero(1),
            Assert(
                And(
                    # Ensure caller is owner
                    Txn.sender() == App.globalGet(Bytes("Owner")),

                    App.globalGet(Bytes("BankingPool")) >= Btoi(Txn.application_args[1]),

                    # commitment
                    Txn.application_args.length() == Int(2),
                )
            ),
            tmpCount.store(App.globalGet(Bytes("BankingPool"))),
            App.globalPut(Bytes("BankingPool"), tmpCount.load() - Btoi(Txn.application_args[1])),
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields(
                {
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver: Txn.sender(),
                    TxnField.amount: Btoi(Txn.application_args[1]),
                    TxnField.fee: Int(0), # use fee pooling
                }
            ),
            InnerTxnBuilder.Submit(),
            Approve(),
        )

    @Subroutine(TealType.none)
    def depositToAccount():
        return Seq(
            # basic sanity checks
            program.check_self(
                group_size=Int(2),
                group_index=Int(0),
            ),
            program.check_rekey_zero(2),
            Assert(
                And(
                    # second transaction is banking deposit payment
                    Gtxn[1].type_enum() == TxnType.Payment,
                    Gtxn[1].receiver() == Global.current_application_address(),
                    Gtxn[1].close_remainder_to() == Global.zero_address(),

                    # commitment
                    Txn.application_args.length() == Int(1),
                )
            ),
            tmpCount.store(App.localGet(Txn.sender(), Bytes("accountBalance"))),
            App.localPut(Txn.sender(),Bytes("accountBalance"), tmpCount.load() + Gtxn[1].amount()),
            Approve(),
        )

    @Subroutine(TealType.none)
    def withdrawFromAccount():
        return Seq(
            # basic sanity checks
            program.check_self(
                group_size=Int(1),
                group_index=Int(0),
            ),
            program.check_rekey_zero(1),
            Assert(
                And(
                    App.localGet(Txn.sender(),Bytes("accountBalance")) >= Btoi(Txn.application_args[1]),
                    # commitment
                    Txn.application_args.length() == Int(2),
                )
            ),
            tmpCount.store(App.localGet(Txn.sender(),Bytes("accountBalance"))),
            App.localPut(Txn.sender(),Bytes("accountBalance"), tmpCount.load() - Btoi(Txn.application_args[1])),
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields(
                {
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver: Txn.sender(),
                    TxnField.amount: Btoi(Txn.application_args[1]),
                    TxnField.fee: Int(0), # use fee pooling
                }
            ),
            InnerTxnBuilder.Submit(),
            Approve(),
        )

    @Subroutine(TealType.none)
    def createCreditAccount():
        tmpCount.store(App.localGet(Txn.sender(), Bytes("creditBalance"))),
        return Seq(
            # basic sanity checks
            program.check_self(
                group_size=Int(2),
                group_index=Int(0),
            ),
            program.check_rekey_zero(2),
            Assert(
                And(
                    Gtxn[1].type_enum() == TxnType.Payment,
                    Gtxn[1].receiver() == Global.current_application_address(),
                    Gtxn[1].close_remainder_to() == Global.zero_address(),

                    App.globalGet(Bytes("BankingPool")) >= Int(10000000), # Pool has funds to open account
                    Gtxn[1].amount() == Int(1000000) + App.localGet(Txn.sender(), Bytes("debtBalance")), # 1 Algo - Fee to open account
                    # commitment
                    Txn.application_args.length() == Int(1),
                )
            ),
            App.localPut(Txn.sender(), Bytes("creditBalance"), tmpCount.load() + Int(10000000)),
            tmpCount.store(App.localGet(Txn.sender(), Bytes("debtBalance"))),
            App.localPut(Txn.sender(), Bytes("debtBalance"), Int(11000000)),
            tmpCount.store(App.globalGet(Bytes("BankingPool"))),
            App.globalPut(Bytes("BankingPool"), tmpCount.load() - Int(10000000)),
            Approve(),
        )

    @Subroutine(TealType.none)
    def withdrawFromCreditAccount():
        return Seq(
            # basic sanity checks
            program.check_self(
                group_size=Int(1),
                group_index=Int(0),
            ),
            program.check_rekey_zero(1),
            Assert(
                And(
                    App.localGet(Txn.sender(),Bytes("creditBalance")) >= Btoi(Txn.application_args[1]),
                    App.globalGet(Bytes("BankingPool")) >= Btoi(Txn.application_args[1]), # Pool has funds to open account

                    # commitment
                    Txn.application_args.length() == Int(2),
                )
            ),
            tmpCount.store(App.localGet(Txn.sender(),Bytes("creditBalance"))),
            App.localPut(Txn.sender(),Bytes("creditBalance"), tmpCount.load() - Btoi(Txn.application_args[1])),
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields(
                {
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver: Txn.sender(),
                    TxnField.amount: Btoi(Txn.application_args[1]),
                    TxnField.fee: Int(0), # use fee pooling
                }
            ),
            InnerTxnBuilder.Submit(),
            Approve(),
        )

    @Subroutine(TealType.none)
    def handleCreation():
        return Seq(
            App.globalPut(Bytes("Owner"), Txn.sender()),
            App.globalPut(Bytes("BankingPool"), Int(0)),
            Approve(),
        )

    return program.event(
        init=Seq(
            handleCreation(),
            Approve(),
        ),
        opt_in=Seq(
            Approve(),
        ),
        no_op=Seq(
            Cond(
            [Txn.application_args[0] == Bytes("Deposit_BankingPool"), depositBankingPool()], # Add to banking pool
            [Txn.application_args[0] == Bytes("Withdraw_BankingPool"), withdrawBankingPool()], # Remove from banking pool
            [Txn.application_args[0] == Bytes("Deposit_Account"), depositToAccount()], # Deposit to users bank account
            [Txn.application_args[0] == Bytes("Withdraw_Account"), withdrawFromAccount()], # Withdraw to users bank account
            [Txn.application_args[0] == Bytes("Create_CreditAccount"), createCreditAccount()], # Create credit card - Pay 1 Algos
            [Txn.application_args[0] == Bytes("Withdraw_CreditAccount"), withdrawFromCreditAccount()] # Withdraw credit card funds and pay for Fee if required
        ),
            Reject(),
        ),
    )

def clear():
    return Approve()