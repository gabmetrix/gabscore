import 'package:data/api/ball_score/ball_score_model.dart';
import 'package:data/api/match/match_model.dart';
import 'package:data/api/user/user_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:khelo/components/action_bottom_sheet.dart';
import 'package:khelo/components/app_page.dart';
import 'package:khelo/components/confirmation_dialog.dart';
import 'package:khelo/components/error_screen.dart';
import 'package:khelo/components/error_snackbar.dart';
import 'package:khelo/domain/extensions/context_extensions.dart';
import 'package:khelo/domain/extensions/widget_extension.dart';
import 'package:khelo/ui/flow/score_board/components/add_extra_sheet.dart';
import 'package:khelo/ui/flow/score_board/components/add_penalty_run_sheet.dart';
import 'package:khelo/ui/flow/score_board/components/match_complete_sheet.dart';
import 'package:khelo/ui/flow/score_board/components/over_complete_sheet.dart';
import 'package:khelo/ui/flow/score_board/components/score_board_buttons.dart';
import 'package:khelo/ui/flow/score_board/components/score_display_view.dart';
import 'package:khelo/ui/flow/score_board/components/select_player_sheet.dart';
import 'package:khelo/ui/flow/score_board/components/select_wicket_taker_sheet.dart';
import 'package:khelo/ui/flow/score_board/components/select_wicket_type_sheet.dart';
import 'package:khelo/ui/flow/score_board/components/striker_selection_sheet.dart';
import 'package:khelo/ui/flow/score_board/score_board_view_model.dart';
import 'package:style/extensions/context_extensions.dart';
import 'package:style/indicator/progress_indicator.dart';
import 'package:style/theme/colors.dart';

import 'components/inning_complete_sheet.dart';

class ScoreBoardScreen extends ConsumerStatefulWidget {
  final String matchId;

  const ScoreBoardScreen({super.key, required this.matchId});

  @override
  ConsumerState createState() => _ScoreBoardScreenState();
}

class _ScoreBoardScreenState extends ConsumerState<ScoreBoardScreen> {
  late ScoreBoardViewNotifier notifier;

  @override
  void initState() {
    super.initState();
    notifier = ref.read(scoreBoardStateProvider.notifier);
    runPostFrame(() => notifier.setData(widget.matchId));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(scoreBoardStateProvider);

    _observeActionError(context, ref);
    _observeShowSelectBatsManSheet(
        context, ref, state.continueWithInjuredPlayers);
    _observeShowSelectBowlerSheet(
        context, ref, state.continueWithInjuredPlayers);
    _observeShowSelectBowlerAndBatsManSheet(
        context, ref, state.continueWithInjuredPlayers);
    _observeShowSelectPlayerSheet(
        context, ref, state.continueWithInjuredPlayers);
    _observeShowSelectWicketTypeSheet(context, ref);
    _observeShowStrikerSelectionSheet(context, ref);
    _observeShowUndoBallConfirmationDialog(context, ref);
    _observeShowOverCompleteSheet(context, ref);
    _observeShowInningCompleteSheet(context, ref);
    _observeShowMatchCompleteSheet(context, ref);
    _observeShowBoundaryConfirmationDialogForSix(context, ref);
    _observeShowBoundaryConfirmationDialogForFour(context, ref);
    _observeShowAddExtraSheetForNoBall(context, ref);
    _observeShowAddExtraSheetForLegBye(context, ref);
    _observeShowAddExtraSheetForBye(context, ref);
    _observeShowAddExtraSheetForFiveSeven(context, ref);
    _observePop(context, ref);
    _observeShowPauseScoringSheet(context, ref);
    _observeShowAddPenaltyRunSheet(context, ref);
    _observeEndMatchSheet(context, ref);
    _observeInvalidUndoToast(context, ref);

    return PopScope(
      canPop: false,
      child: AppPage(
        title: context.l10n.score_board_screen_title,
        actions: [_moreOptionButton(context, state)],
        automaticallyImplyLeading: false,
        resizeToAvoidBottomInset: false,
        body: Builder(builder: (context) {
          return _body(context, state);
        }),
      ),
    );
  }

  Widget _moreOptionButton(
    BuildContext context,
    ScoreBoardViewState state,
  ) {
    return IconButton(
        onPressed: () async {
          showActionBottomSheet(
              context: context,
              items: MatchOption.values
                  .map(
                    (option) => BottomSheetAction(
                      title: option.getTitle(context),
                      onTap: () {
                        if (option != MatchOption.continueWithInjuredPlayer) {
                          context.pop();
                          notifier.onMatchOptionSelect(option, true);
                        }
                      },
                      child: option == MatchOption.continueWithInjuredPlayer
                          ? _toggleButton(context, state)
                          : null,
                    ),
                  )
                  .toList());
        },
        icon: const Icon(Icons.more_horiz));
  }

  Widget _toggleButton(
    BuildContext context,
    ScoreBoardViewState state,
  ) {
    bool isContinue = state.continueWithInjuredPlayers;

    return StatefulBuilder(
      builder: (context, setStateSwitch) {
        return Theme(
          data: context.brightness == Brightness.dark
              ? materialThemeDataDark
              : materialThemeDataLight,
          child: SizedBox(
            height: 22,
            child: Switch(
              inactiveTrackColor: context.colorScheme.containerHigh,
              trackOutlineColor: WidgetStateColor.transparent,
              thumbColor: WidgetStatePropertyAll(context.colorScheme.onPrimary),
              value: isContinue,
              onChanged: (value) {
                setStateSwitch(() {
                  isContinue = value;
                  notifier.onContinueWithInjuredPlayersChange(value);
                });
              },
            ),
          ),
        );
      },
    );
  }

  Widget _body(
    BuildContext context,
    ScoreBoardViewState state,
  ) {
    if (state.loading) {
      return const Center(child: AppProgressIndicator());
    }
    if (state.error != null) {
      return ErrorScreen(
        error: state.error,
        onRetryTap: notifier.onResume,
      );
    }

    return Column(
      children: [
        ScoreDisplayView(
          currentOverBall: notifier.getCurrentOverBall(),
          overCountString: notifier.getOverCount(),
          battingTeamName: notifier.getTeamName(),
          bowlingTeamName: notifier.getTeamName(isBattingTeam: false),
        ),
        ScoreBoardButtons(onTap: notifier.onScoreButtonTap),
      ],
    );
  }

  Future<void> _showSelectPlayerSheet(
    BuildContext context,
    bool continueWithInjuredPlayers,
    PlayerSelectionType type,
  ) async {
    final result = await SelectPlayerSheet.show<
        ({
          List<({List<MatchPlayer> players, String teamId})>? selectedPlayer,
          bool contWithInjPlayer,
        })>(
      context,
      type: type,
      continueWithInjPlayer: continueWithInjuredPlayers,
      batsManList: notifier.getFilteredPlayerList(PlayerSelectionType.batsMan),
      bowlerList: notifier.getFilteredPlayerList(PlayerSelectionType.bowler),
    );
    if (result != null && context.mounted) {
      if (result.selectedPlayer != null) {
        notifier.setPlayers(
            currentPlayers: result.selectedPlayer!,
            contWithInjPlayer: result.contWithInjPlayer);
      } else {
        notifier.onReviewMatchResult(result.contWithInjPlayer);
      }
    }
  }

  Future<void> _showSelectWicketTypeSheet(BuildContext context) async {
    final type = await SelectWicketTypeSheet.show<WicketType>(context);
    if (type != null && context.mounted) {
      _onWicketTypeSelect(context, type);
    }
  }

  Future<void> _onWicketTypeSelect(
      BuildContext context, WicketType type) async {
    final outBatsMan = await StrikerSelectionSheet.show<UserModel>(
      context,
      isForStrikerSelection: false,
    );

    String? wicketTakerId;
    if ((type == WicketType.caught ||
            type == WicketType.bowled ||
            type == WicketType.stumped ||
            type == WicketType.runOut ||
            type == WicketType.caughtBehind) &&
        context.mounted) {
      wicketTakerId = await SelectWicketTakerSheet.show<String>(context,
          fielderList: notifier.getFielderList());
    }

    int? extra;
    if (type == WicketType.runOut && context.mounted) {
      final runBeforeWicket = await AddExtraSheet.show<(int, bool, bool)>(
          context,
          isOnWicket: true);
      extra = runBeforeWicket?.$1;
    }

    notifier.addBall(
        run: 0,
        extra: extra,
        playerOutId: outBatsMan?.id,
        wicketTakerId: wicketTakerId,
        wicketType: type);
  }

  Future<void> _showStrikerSelectionSheet(BuildContext context) async {
    final striker = await StrikerSelectionSheet.show<UserModel>(context);
    if (striker != null && context.mounted) {
      notifier.setOrSwitchStriker(batsManId: striker.id);
    }
  }

  Future<void> _showOverCompleteSheet(BuildContext context) async {
    final startNext = await OverCompleteSheet.show<bool>(
        context, notifier.getCurrentOverStatics());
    if (startNext != null && context.mounted) {
      if (startNext) {
        notifier.startNextOver();
      } else {
        notifier.undoLastBall();
      }
    }
  }

  Future<void> _showInningCompleteSheet(BuildContext context) async {
    final startNext = await InningCompleteSheet.show<bool>(context,
        extra: notifier.getExtras(),
        teamName: notifier.getTeamName() ??
            context.l10n.score_board_current_team_title,
        overCountString: notifier.getOverCount());
    if (startNext != null && context.mounted) {
      if (startNext) {
        notifier.startNextInning();
      } else {
        notifier.undoLastBall();
      }
    }
  }

  Future<void> _showMatchCompleteSheet(BuildContext context) async {
    final endMatch = await MatchCompleteSheet.show<bool>(
      context,
      firstTeamRunStat: notifier.getTeamRunDetails(true),
      secondTeamRunStat: notifier.getTeamRunDetails(false),
    );
    if (endMatch != null && context.mounted) {
      if (endMatch) {
        notifier.endMatch();
      } else {
        notifier.undoLastBall();
      }
    }
  }

  Future<void> _showBoundaryConfirmationDialog(
      BuildContext context, int run) async {
    showConfirmationDialog(
      context,
      title: context.l10n.score_board_boundary_text,
      message: context.l10n.score_board_is_boundary_text,
      isDestructiveAction: true,
      confirmBtnText: context.l10n.common_yes_title,
      cancelBtnText: context.l10n.common_no_title,
      onConfirm: () =>
          notifier.addBall(run: run, isSix: run == 6, isFour: run == 4),
      onCancel: () => notifier.addBall(run: run),
    );
  }

  Future<void> _showAddExtraSheet(
    BuildContext context,
    ExtrasType? extra,
  ) async {
    final extraData = await AddExtraSheet.show<(int, bool, bool)>(
      context,
      extrasType: extra,
      isFiveSeven: extra == null,
    );
    if (context.mounted && extraData != null) {
      int runs = extraData.$1;
      bool isBoundary = extraData.$2;
      bool notFromBat = extraData.$3;

      if (extra == ExtrasType.noBall) {
        notifier.addBall(
          run: notFromBat ? 0 : runs,
          extrasType: ExtrasType.noBall,
          extra: notFromBat ? 1 + runs : 1,
          isFour: isBoundary && runs == 4,
          isSix: isBoundary && runs == 6,
        );
      } else if (extra == ExtrasType.legBye || extra == ExtrasType.bye) {
        notifier.addBall(
          run: 0,
          extrasType: extra,
          extra: runs,
        );
      } else {
        notifier.addBall(run: runs);
      }
    }
  }

  Future<void> _showAddPenaltyRunSheet(BuildContext context) async {
    final penalty =
        await AddPenaltyRunSheet.show<({String teamId, int runs})>(context);

    if (penalty != null && context.mounted) {
      notifier.handlePenaltyRun(penalty);
    }
  }

  void _observeActionError(BuildContext context, WidgetRef ref) {
    ref.listen(scoreBoardStateProvider.select((value) => value.actionError),
        (previous, next) {
      if (next != null) {
        showErrorSnackBar(context: context, error: next);
      }
    });
  }

  void _observeShowSelectBatsManSheet(
    BuildContext context,
    WidgetRef ref,
    bool continueWithInjuredPlayers,
  ) {
    ref.listen(
        scoreBoardStateProvider.select((value) => value.showSelectBatsManSheet),
        (previous, next) {
      if (next != null) {
        _showSelectPlayerSheet(
          context,
          continueWithInjuredPlayers,
          PlayerSelectionType.batsMan,
        );
      }
    });
  }

  void _observeShowSelectBowlerSheet(
    BuildContext context,
    WidgetRef ref,
    bool continueWithInjuredPlayers,
  ) {
    ref.listen(
        scoreBoardStateProvider.select((value) => value.showSelectBowlerSheet),
        (previous, next) {
      if (next != null) {
        _showSelectPlayerSheet(
          context,
          continueWithInjuredPlayers,
          PlayerSelectionType.bowler,
        );
      }
    });
  }

  void _observeShowSelectBowlerAndBatsManSheet(
    BuildContext context,
    WidgetRef ref,
    bool continueWithInjuredPlayers,
  ) {
    ref.listen(
        scoreBoardStateProvider
            .select((value) => value.showSelectBowlerAndBatsManSheet),
        (previous, next) {
      if (next != null) {
        _showSelectPlayerSheet(
          context,
          continueWithInjuredPlayers,
          PlayerSelectionType.batsManAndBowler,
        );
      }
    });
  }

  void _observeShowSelectPlayerSheet(
    BuildContext context,
    WidgetRef ref,
    bool continueWithInjuredPlayers,
  ) {
    ref.listen(
        scoreBoardStateProvider.select((value) => value.showSelectPlayerSheet),
        (previous, next) {
      if (next != null) {
        _showSelectPlayerSheet(
          context,
          continueWithInjuredPlayers,
          PlayerSelectionType.all,
        );
      }
    });
  }

  void _observeShowSelectWicketTypeSheet(BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider.select(
            (value) => value.showSelectWicketTypeSheet), (previous, next) {
      if (next != null) {
        _showSelectWicketTypeSheet(context);
      }
    });
  }

  void _observeShowStrikerSelectionSheet(BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider.select(
            (value) => value.showStrikerSelectionSheet), (previous, next) {
      if (next != null) {
        _showStrikerSelectionSheet(context);
      }
    });
  }

  void _observeShowUndoBallConfirmationDialog(
      BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider.select(
            (value) => value.showUndoBallConfirmationDialog), (previous, next) {
      if (next != null) {
        showConfirmationDialog(context,
            title: context.l10n.score_board_undo_last_ball_title,
            message: context.l10n.score_board_undo_last_ball_description_text,
            confirmBtnText: context.l10n.score_board_undo_title,
            onConfirm: notifier.undoLastBall);
      }
    });
  }

  void _observeShowOverCompleteSheet(BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider.select((value) => value.showOverCompleteSheet),
        (previous, next) {
      if (next != null) {
        _showOverCompleteSheet(context);
      }
    });
  }

  void _observeShowInningCompleteSheet(
    BuildContext context,
    WidgetRef ref,
  ) {
    ref.listen(
        scoreBoardStateProvider.select(
            (value) => value.showInningCompleteSheet), (previous, next) {
      if (next != null) {
        _showInningCompleteSheet(context);
      }
    });
  }

  void _observeShowMatchCompleteSheet(
    BuildContext context,
    WidgetRef ref,
  ) {
    ref.listen(
        scoreBoardStateProvider.select((value) => value.showMatchCompleteSheet),
        (previous, next) {
      if (next != null) {
        _showMatchCompleteSheet(context);
      }
    });
  }

  void _observeShowBoundaryConfirmationDialogForSix(
      BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider
            .select((value) => value.showBoundaryConfirmationDialogForSix),
        (previous, next) {
      if (next != null) {
        _showBoundaryConfirmationDialog(context, 6);
      }
    });
  }

  void _observeShowBoundaryConfirmationDialogForFour(
      BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider
            .select((value) => value.showBoundaryConfirmationDialogForFour),
        (previous, next) {
      if (next != null) {
        _showBoundaryConfirmationDialog(context, 4);
      }
    });
  }

  void _observeShowAddExtraSheetForNoBall(BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider.select(
            (value) => value.showAddExtraSheetForNoBall), (previous, next) {
      if (next != null) {
        _showAddExtraSheet(context, ExtrasType.noBall);
      }
    });
  }

  void _observeShowAddExtraSheetForLegBye(BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider.select(
            (value) => value.showAddExtraSheetForLegBye), (previous, next) {
      if (next != null) {
        _showAddExtraSheet(context, ExtrasType.legBye);
      }
    });
  }

  void _observeShowAddExtraSheetForBye(BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider.select(
            (value) => value.showAddExtraSheetForBye), (previous, next) {
      if (next != null) {
        _showAddExtraSheet(context, ExtrasType.bye);
      }
    });
  }

  void _observeShowAddExtraSheetForFiveSeven(
      BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider.select(
            (value) => value.showAddExtraSheetForFiveSeven), (previous, next) {
      if (next != null) {
        _showAddExtraSheet(context, null);
      }
    });
  }

  void _observePop(BuildContext context, WidgetRef ref) {
    ref.listen(scoreBoardStateProvider.select((value) => value.pop),
        (previous, next) {
      if (next) {
        context.pop();
      }
    });
  }

  void _observeShowPauseScoringSheet(BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider.select((value) => value.showPauseScoringSheet),
        (previous, next) {
      if (next != null) {
        showConfirmationDialog(context,
            title: context.l10n.score_board_pause_scoring_title,
            message: context.l10n.score_board_pause_scoring_description_text,
            confirmBtnText: context.l10n.score_board_pause_title,
            onConfirm: notifier.onPauseScoring);
      }
    });
  }

  void _observeShowAddPenaltyRunSheet(BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider.select((value) => value.showAddPenaltyRunSheet),
        (previous, next) {
      if (next != null) {
        _showAddPenaltyRunSheet(
          context,
        );
      }
    });
  }

  void _observeEndMatchSheet(BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider.select((value) => value.showEndMatchSheet),
        (previous, next) {
      if (next != null) {
        showConfirmationDialog(context,
            title: context.l10n.score_board_end_match_title,
            message: context.l10n.score_board_end_match_description_text,
            confirmBtnText: context.l10n.common_okay_title,
            onConfirm: notifier.abandonMatch);
      }
    });
  }

  void _observeInvalidUndoToast(BuildContext context, WidgetRef ref) {
    ref.listen(
        scoreBoardStateProvider.select((value) => value.invalidUndoToast),
        (previous, next) {
      if (next != null) {
        showSnackBar(
          context,
          context.l10n.score_board_can_undo_till_running_over_title,
          length: SnackBarLength.long,
        );
      }
    });
  }
}
