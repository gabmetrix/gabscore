import 'package:data/api/match/match_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:khelo/components/app_page.dart';
import 'package:khelo/components/error_screen.dart';
import 'package:khelo/components/image_avatar.dart';
import 'package:khelo/domain/extensions/context_extensions.dart';
import 'package:khelo/domain/formatter/date_formatter.dart';
import 'package:khelo/ui/app_route.dart';
import 'package:khelo/ui/flow/home/home_view_model.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import 'package:style/animations/on_tap_scale.dart';
import 'package:style/extensions/context_extensions.dart';
import 'package:style/indicator/progress_indicator.dart';
import 'package:style/text/app_text_style.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with AutomaticKeepAliveClientMixin, WidgetsBindingObserver {
  final _controller = PageController(keepPage: true, viewportFraction: 0.9);
  late HomeViewNotifier notifier;
  bool _wantKeepAlive = true;

  @override
  bool get wantKeepAlive => _wantKeepAlive;

  @override
  void initState() {
    WidgetsBinding.instance.addObserver(this);
    super.initState();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      setState(() {
        _wantKeepAlive = false;
      });
    } else if (state == AppLifecycleState.resumed) {
      setState(() {
        _wantKeepAlive = true;
      });
    } else if (state == AppLifecycleState.detached) {
      // deallocate resources
      notifier.dispose();
      WidgetsBinding.instance.removeObserver(this);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final state = ref.watch(homeViewStateProvider);
    notifier = ref.watch(homeViewStateProvider.notifier);

    return AppPage(
      title: context.l10n.home_screen_title,
      body: _body(context, notifier, state),
    );
  }

  Widget _body(
    BuildContext context,
    HomeViewNotifier notifier,
    HomeViewState state,
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

    if (state.matches.isNotEmpty) {
      return _matchCardSlider(context, state);
    } else {
      return _emptyMatchView(context);
    }
  }

  Widget _matchCardSlider(
    BuildContext context,
    HomeViewState state,
  ) {
    return Column(
      children: [
        SizedBox(
          height: 184,
          child: state.matches.length == 1
              ? Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0),
                  child: _matchCell(context, state.matches.first),
                )
              : PageView.builder(
                  controller: _controller,
                  itemCount: state.matches.length,
                  itemBuilder: (context, index) {
                    return _matchCell(context, state.matches[index]);
                  },
                ),
        ),
        const SizedBox(height: 16),
        if (state.matches.length >= 2) ...[
          SmoothPageIndicator(
            controller: _controller,
            count: state.matches.length,
            effect: ExpandingDotsEffect(
              expansionFactor: 2,
              dotHeight: 8,
              dotWidth: 8,
              dotColor: context.colorScheme.containerHigh,
              activeDotColor: context.colorScheme.secondary,
            ),
          )
        ],
      ],
    );
  }

  Widget _matchCell(BuildContext context, MatchModel match) {
    return OnTapScale(
      onTap: () => AppRoute.matchDetailTab(matchId: match.id ?? "INVALID ID")
          .push(context),
      child: Container(
        padding: const EdgeInsets.all(16),
        margin: const EdgeInsets.symmetric(horizontal: 8),
        decoration: BoxDecoration(
          border: Border.all(color: context.colorScheme.secondary),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _matchDetailView(context, match),
            const SizedBox(height: 40),
            _teamScore(
              context,
              match.teams.first,
              match.teams.elementAt(1).wicket,
              match.current_playing_team_id == match.teams.first.team.id,
            ),
            const SizedBox(height: 8),
            _teamScore(
                context,
                match.teams.elementAt(1),
                match.teams.first.wicket,
                match.current_playing_team_id ==
                    match.teams.elementAt(1).team.id),
            const SizedBox(
              height: 8,
            ),
          ],
        ),
      ),
    );
  }

  Widget _teamScore(
    BuildContext context,
    MatchTeamModel team,
    int wicket,
    bool isCurrentlyPlaying,
  ) {
    return Row(
      children: [
        ImageAvatar(
          initial: team.team.name[0].toUpperCase(),
          imageUrl: team.team.profile_img_url,
          size: 35,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(team.team.name,
              overflow: TextOverflow.ellipsis,
              maxLines: 2,
              style: AppTextStyle.subtitle1.copyWith(
                  color: isCurrentlyPlaying
                      ? context.colorScheme.primary
                      : context.colorScheme.textPrimary)),
        ),
        Text.rich(TextSpan(
            text: "${team.run}-$wicket",
            style: AppTextStyle.subtitle2
                .copyWith(color: context.colorScheme.textPrimary),
            children: [
              TextSpan(
                text: " ${team.over}",
                style: AppTextStyle.body2
                    .copyWith(color: context.colorScheme.textSecondary),
              )
            ]))
      ],
    );
  }

  Widget _matchDetailView(
    BuildContext context,
    MatchModel match,
  ) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.start,
      children: [
        Text(match.start_time.format(context, DateFormatType.dateAndTime),
            style: AppTextStyle.body2
                .copyWith(color: context.colorScheme.textPrimary)),
        Container(
          height: 5,
          width: 5,
          margin: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: context.colorScheme.textPrimary,
          ),
        ),
        Text(match.ground,
            style: AppTextStyle.body2
                .copyWith(color: context.colorScheme.textPrimary)),
      ],
    );
  }

  Widget _emptyMatchView(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      width: double.infinity,
      margin: context.mediaQueryPadding + const EdgeInsets.all(16),
      decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.colorScheme.primary)),
      child: IntrinsicHeight(
        child: Column(
          children: [
            Text(
              context.l10n.home_screen_no_matches_title,
              textAlign: TextAlign.center,
              style: AppTextStyle.header2
                  .copyWith(color: context.colorScheme.textPrimary),
            ),
            const SizedBox(
              height: 8,
            ),
            Text(
              context.l10n.home_screen_no_matches_description_text,
              textAlign: TextAlign.center,
              style: AppTextStyle.subtitle1
                  .copyWith(color: context.colorScheme.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
